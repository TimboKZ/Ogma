/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const upath = require('upath');
const Promise = require('bluebird');
const ExactTrie = require('exact-trie');
const Database = require('better-sqlite3');
const ThumbnailGenerator = require('fs-thumbnail');

const Util = require('./Util');
const {VideoExtensions, ImageExtensions} = require('../../shared/typedef');

const thumbExtsTrie = new ExactTrie();
for (const ext of VideoExtensions) thumbExtsTrie.put(ext, true, true);
for (const ext of ImageExtensions) thumbExtsTrie.put(ext, true, true);

// noinspection JSUnusedLocalSymbols
const logger = Util.getLogger();

class ThumbManager {

    /**
     * @param {object} data
     * @param {string} data.thumbsDir
     * @param {string} data.thumbsDbPath
     * @param {string} data.basePath
     */
    constructor(data) {
        this.thumbsDir = data.thumbsDir;
        this.thumbsDbPath = data.thumbsDbPath;
        this.basePath = data.basePath;

        this.generator = new ThumbnailGenerator({verbose: false, size: 300, quality: 30});
    }

    init() {
        // Prepare file system structure
        fs.ensureDirSync(this.thumbsDir);
        this.db = new Database(this.thumbsDbPath);
        const db = this.db;
        db.exec(`CREATE TABLE IF NOT EXISTS
                     thumbnails
                 (
                     hash    TEXT PRIMARY KEY UNIQUE,
                     nixPath TEXT,
                     epoch   INTEGER
                 )`);
        db.exec(`CREATE INDEX IF NOT EXISTS thumb_nix_path ON thumbnails (nixPath)`);
        this.insertThumb = Util.prepSqlRun(db, 'REPLACE INTO thumbnails VALUES(?, ?, ?)');
        /** @type {function(string): {hash: string, nixPath: string, epoch: number}} */
        this.selectThumbByHash = Util.prepSqlGet(db, 'SELECT * FROM thumbnails WHERE hash = ?');
        this.deleteThumbByHash = Util.prepSqlRun(db, 'DELETE FROM thumbnails WHERE hash = ?');
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
     * @returns {boolean}
     */
    checkThumbnailSync(data) {
        const {hash, stats} = data;
        const thumbData = this.selectThumbByHash(hash);

        // Check if thumbnail was previously generated
        if (!thumbData) return false;

        // Check if thumbnail exists only in the database
        const thumbName = `${hash}.jpg`;
        const thumbPath = path.join(this.thumbsDir, thumbName);
        if (!fs.pathExistsSync(thumbPath)) {
            this.deleteThumbByHash(hash);
            return false;
        }

        // Check if thumbnail is outdated
        if (stats) {
            const fileEpoch = stats.mtimeMs / 1000;
            if (fileEpoch > thumbData.epoch) {
                return false;
            }
        }

        // Return thumb name if everything is ok
        return true;
    }

    /**
     * @param {object} data
     * @param {string} data.hash File hash.
     */
    removeThumbnail(data) {
        const {hash} = data;

        return Promise.resolve()
            .then(() => {
                this.deleteThumbByHash(hash);

                const thumbName = `${hash}.jpg`;
                const thumbPath = path.join(this.thumbsDir, thumbName);
                return fs.pathExistsSync(thumbPath) ? fs.unlink(thumbPath) : null;
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root, can be OS specific.
     * @returns {Promise.<string|null>}
     */
    getOrCreateThumbnail(data) {
        if (!this.canHaveThumbnail(data)) return Promise.resolve(null);

        const osPath = path.join(this.basePath, data.path);
        const nixPath = upath.toUnix(data.path);
        const hash = Util.getFileHash(nixPath);

        const thumbName = `${hash}.jpg`;
        const thumbPath = path.join(this.thumbsDir, thumbName);

        return fs.stat(osPath)
            .then(stats => this.checkThumbnailSync({hash, stats}))
            .then(thumbExists => {
                if (thumbExists) return thumbName;

                return this.generator.getThumbnail({path: osPath, output: thumbPath})
                    .then(generatedThumbPath => {
                        // Some error occurred during generation
                        if (!generatedThumbPath) return null;

                        // Store thumb data into the database
                        const epoch = Math.round(new Date().getTime() / 1000);
                        this.insertThumb(hash, nixPath, epoch);

                        return thumbName;
                    });
            });
    }

    close() {
        this.db.close();
    }

}

module.exports = ThumbManager;
