/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const upath = require('upath');
const Denque = require('denque');
const shortid = require('shortid');
const Promise = require('bluebird');
const ExactTrie = require('exact-trie');
const Database = require('better-sqlite3');
const childProcess = require('child_process');

const Util = require('../helpers/Util');
const {BackendEvents, ThumbnailState, VideoExtensions, ImageExtensions} = require('../../shared/typedef');

const thumbExtsTrie = new ExactTrie();
for (const ext of VideoExtensions) thumbExtsTrie.put(ext, true, true);
for (const ext of ImageExtensions) thumbExtsTrie.put(ext, true, true);

const logger = Util.getLogger();

class ThumbManager {

    /**
     * @param {object} data
     * @param {Environment} data.environment
     * @param {string} data.thumbsDir
     * @param {string} data.thumbsDbPath
     * @param {string} data.basePath
     */
    constructor(data) {
        this.environment = data.environment;
        this.emitter = data.environment.emitter;
        this.thumbsDir = data.thumbsDir;
        this.thumbsDbPath = data.thumbsDbPath;
        this.basePath = data.basePath;
    }

    init() {
        this._initDbAndFs();
        this._initChildProcess();
    }

    _initDbAndFs() {
        const prepareDbMethods = () => {
            /** @type {function(id: string, hash: string, nixPath: NixPath, epoch: number): void} */
            this.insertThumb = Util.prepSqlRun(db, 'REPLACE INTO thumbnails VALUES(?, ?, ?, ?)');
            /** @type {function(hash: string): {id: string, hash: string, nixPath: NixPath, epoch: number}} */
            this.selectThumbByHash = Util.prepSqlGet(db, 'SELECT * FROM thumbnails WHERE hash = ?');
            /** @type {function(hash: string): void} */
            this.deleteThumbByHash = Util.prepSqlRun(db, 'DELETE FROM thumbnails WHERE hash = ?');
            const updateEntityHash = Util.prepSqlRun(db, 'UPDATE thumbnails SET hash = ?, nixPath = ? WHERE hash = ?');
            /** @type {function(oldHash: string, newHash: string, newNixPath: NixPath): void} */
            this.updateThumbHash = (oldHash, newHash, newNixPath) => updateEntityHash(newHash, newNixPath, oldHash);

            this.selectAllThumbsByDir =
                Util.prepSqlAll(db, 'SELECT * FROM thumbnails WHERE nixPath LIKE (? || \'/%\')');
            /** @type {function(oldNixPath: NixPath, newNixPath: NixPath): void} */
            this.updateChildThumbPaths = Util.prepTransaction(db, (oldNixPath, newNixPath) => {
                const thumbs = this.selectAllThumbsByDir(oldNixPath);
                for (let i = 0; i < thumbs.length; ++i) {
                    const entity = thumbs[i];
                    const oldHash = entity.hash;
                    const newPath = `${newNixPath}${entity.nixPath.substring(oldNixPath.length)}`;
                    const newHash = Util.fileHash(newPath);
                    this.updateThumbHash(oldHash, newHash, newPath);
                }
            });
        };

        // Prepare file system structure
        fs.ensureDirSync(this.thumbsDir);
        let db = new Database(this.thumbsDbPath);

        try {
            prepareDbMethods();
        } catch (error) {
            logger.error('Error occurred while initialising DB methods for thumbnail manager:', error);
            logger.error('Resetting thumbnail DB files and images.');

            db.close();
            fs.unlinkSync(this.thumbsDbPath);
            fs.emptyDirSync(this.thumbsDir);

            db = new Database(this.thumbsDbPath);
            db.exec(`CREATE TABLE IF NOT EXISTS thumbnails
                 (
                     id      TEXT PRIMARY KEY UNIQUE,
                     hash    TEXT UNIQUE,
                     nixPath TEXT UNIQUE,
                     epoch   INTEGER
                 )`);
            prepareDbMethods();
        }


        this.db = db;
    }

    _initChildProcess() {
        this.childProcessReqId = 0;
        this.childProcessReqMap = {};
        this.childProcessNixPathMap = {};
        this.childProcess = childProcess.fork(path.join(__dirname, 'ThumbnailGeneratorProcess.js'));

        this.thumbsUpdatesQueue = new Denque();
        this.debounceEmitThumbsUpdate = _.debounce(() => {
            const queue = this.thumbsUpdatesQueue;
            this.thumbsUpdatesQueue = new Denque();
            const eventData = {id: this.environment.id, thumbs: queue.toArray(), thumbState: ThumbnailState.Ready};
            console.log(eventData);
            this.emitter.emit(BackendEvents.EnvUpdateThumbs, eventData);
        }, 100);

        this.sendChildProcessRequest = (thumbData, filePath, thumbPath) => {
            if (this.childProcessNixPathMap[thumbData.nixPath]) return;
            this.childProcessNixPathMap[thumbData.nixPath] = true;
            const reqId = this.childProcessReqId++;
            this.childProcessReqMap[reqId] = {thumbData, filePath};
            this.childProcess.send({reqId, filePath, thumbPath});
        };

        this.childProcess.on('message', data => {
            const {reqId, error, result} = data;
            const {thumbData, filePath} = this.childProcessReqMap[reqId];
            const {id, hash, nixPath, thumbName} = thumbData;
            delete this.childProcessReqMap[reqId];
            delete this.childProcessNixPathMap[nixPath];
            if (error) {
                logger.error(`Child process error occurred while creating thumbnail for path "${filePath}":`, error);
                return;
            }
            if (!result) {
                // Child process could not generate the thumbnail
                return;
            }

            // Store thumb data into the database
            const epoch = Math.round(new Date().getTime() / 1000);
            this.insertThumb(id, hash, nixPath, epoch);
            this.thumbsUpdatesQueue.push({hash, thumbName});
            this.debounceEmitThumbsUpdate();
        });
    }

    // noinspection JSMethodCanBeStatic
    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root, can be OS specific.
     * @returns {Promise.<string|null>}
     */
    canHaveThumbnail(data) {
        return thumbExtsTrie.hasWithCheckpoints(data.path, '.', true);
    }

    /**
     * @param {object} data
     * @param {string} data.hash File hash.
     * @param {Stats} data.stats File stats retrieved using `fs.stat()`.
     * @returns {string|null} Name of the thumbnail file, if it exists.
     */
    tryThumbnailSync(data) {
        const {hash, stats} = data;
        const thumbData = this.selectThumbByHash(hash);

        // Check if thumbnail was previously generated
        if (!thumbData) return null;

        // Check if thumbnail exists only in the database
        const thumbName = `${thumbData.id}.jpg`;
        const thumbPath = path.join(this.thumbsDir, thumbName);
        if (!fs.pathExistsSync(thumbPath)) {
            this.deleteThumbByHash(hash);
            return null;
        }

        // Check if thumbnail is outdated
        if (stats) {
            const fileEpoch = stats.mtimeMs / 1000;
            if (fileEpoch > thumbData.epoch) {
                return null;
            }
        }

        // Return thumb name if everything is ok
        return thumbName;
    }

    /**
     * @param {object} data
     * @param {NixPath} data.oldNixPath
     * @param {NixPath} data.newNixPath
     */
    renameFile(data) {
        const {oldNixPath, newNixPath} = data;
        return Promise.resolve()
            .then(() => {
                const oldHash = Util.fileHash(oldNixPath);
                const newHash = Util.fileHash(newNixPath);
                this.updateThumbHash(oldHash, newHash, newNixPath);
                this.updateChildThumbPaths(oldNixPath, newNixPath);
            });
    }

    /**
     * @param {object} data
     * @param {string} data.hash
     * @param {string} data.nixPath
     */
    removeFile(data) {
        const {hash, nixPath} = data;

        return Promise.resolve()
            .then(() => {
                const thumbData = this.selectThumbByHash(hash);
                if (thumbData) this.deleteThumbByHash(hash);
                const thumbs = this.selectAllThumbsByDir(nixPath);
                if (thumbData) thumbs.push(thumbs);

                const removePromises = new Array(thumbs.length);
                for (let i = 0; i < thumbs.length; ++i) {
                    const thumb = thumbs[i];
                    const thumbName = `${thumb.id}.jpg`;
                    const thumbPath = path.join(this.thumbsDir, thumbName);
                    removePromises[i] = fs.existsSync(thumbPath) ? fs.unlink(thumbPath) : null;
                }
                return Promise.all(removePromises);
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path File path relative to environment root, can be OS specific.
     * @returns {Promise.<string|boolean|null>} Returns the promise that resolve to file name if the thumbnail is
     *                                          available, `true` if it's not available but a new version was requested,
     *                                          and `null` if the thumbnail is not available and cannot be generated.
     */
    getOrCreateThumbnail(data) {
        if (!this.canHaveThumbnail(data)) return Promise.resolve(null);

        const osPath = path.join(this.basePath, data.path);
        const nixPath = upath.toUnix(data.path);
        const hash = Util.fileHash(nixPath);

        const id = shortid.generate();
        const thumbName = `${id}.jpg`;
        const thumbPath = path.join(this.thumbsDir, thumbName);

        return fs.stat(osPath)
            .then(stats => this.tryThumbnailSync({hash, stats}))
            .then(thumbExists => {
                if (thumbExists) return thumbName;

                this.sendChildProcessRequest({id, hash, nixPath, thumbName}, osPath, thumbPath);
                return true;
            });
    }

    close() {
        this.childProcess.kill();
        this.db.close();
    }

}

module.exports = ThumbManager;
