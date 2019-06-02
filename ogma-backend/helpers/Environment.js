/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const trash = require('trash');
const upath = require('upath');
const Promise = require('bluebird');
const {shell} = require('electron');
const Database = require('better-sqlite3');

const Util = require('./Util');
const ThumbnailManager = require('./ThumbnailManager');
const {OgmaEnvFolder, BackendEvents, EnvProperty, Colors, ThumbnailState} = require('../../shared/typedef');

const logger = Util.getLogger();

class Environment {

    /**
     * @param {object} data
     * @param {OgmaCore} data.ogmaCore
     * @param {AbsPath} data.path Absolute path to the environment, can be OS specific
     * @param {EnvironmentManager} data.envManager
     * @param {boolean} [data.allowCreate]
     */
    constructor(data) {
        this.ogmaCore = data.ogmaCore;
        this.emitter = this.ogmaCore.emitter;
        this.path = data.path;
        this.envManager = data.envManager;
        this.allowCreate = !!data.allowCreate;

        this.dirName = path.basename(this.path);
        this.confDir = path.join(this.path, OgmaEnvFolder);
        this.dbPath = path.join(this.confDir, 'data.sqlite3');

        this.thumbsDir = path.join(this.confDir, 'thumbnails');
        const thumbsDbPath = path.join(this.confDir, 'thumbs.sqlite3');
        this.thumbManager = new ThumbnailManager({thumbsDir: this.thumbsDir, thumbsDbPath, basePath: this.path});
    }

    init() {
        if (!fs.pathExistsSync(this.path)) {
            throw new Error(`Specified directory does not exist! Path: ${data.path}`);
        }

        const confDirExists = fs.pathExistsSync(this.confDir);
        const dbExists = fs.pathExistsSync(this.dbPath);
        if ((!confDirExists || !dbExists) && !this.allowCreate) {
            throw new Error(`Specified directory is not a valid Ogma environment! Path: ${this.path}`);
        }
        if (!confDirExists) fs.ensureDirSync(this.confDir);

        this._prepareDb();
        this.thumbManager.init();
    }

    _prepareDb() {
        this.db = new Database(this.dbPath);
        const db = this.db;

        // Create tables for all necessary data
        db.exec('CREATE TABLE IF NOT EXISTS properties (name TEXT PRIMARY KEY, value TEXT)');
        db.exec('CREATE TABLE IF NOT EXISTS entities (entity_id TEXT PRIMARY KEY, file_path TEXT UNIQUE)');
        db.exec(`CREATE TABLE IF NOT EXISTS tags
                 (
                     tag_id TEXT PRIMARY KEY,
                     name   TEXT,
                     colour TEXT
                 )`);

        // Setup get and set commands
        this._setProperty = Util.prepSqlRun(db, 'REPLACE INTO properties VALUES (?, ?)');
        this._getProperty = Util.prepSqlGet(db, 'SELECT value FROM properties WHERE name = ?', true);

        // Load environment properties
        const getEnvProperty = (property, defaultValueFunc) => {
            let value = this._getProperty(property);
            if (value === undefined || value === '') {
                const defaultValue = defaultValueFunc();
                this._setProperty(property, defaultValue);
                value = defaultValue;
            }
            return value;
        };
        this.id = getEnvProperty(EnvProperty.id, () => this.envManager.getNewId());
        this.slug = getEnvProperty(EnvProperty.slug, () => this.envManager.getNewSlug(this.dirName));
        this.name = getEnvProperty(EnvProperty.name, () => this.dirName);
        this.icon = getEnvProperty(EnvProperty.icon, () => 'box-open');
        this.color = getEnvProperty(EnvProperty.color, () => _.sample(Colors));
    }

    setProperty(data) {
        delete data[EnvProperty.id];
        delete data[EnvProperty.path];

        for (const key of Object.keys(data)) {
            if (!EnvProperty[key]) return;
            const value = data[key];
            this._setProperty(key, value);
            this[key] = value;
        }

        this.emitter.emit(BackendEvents.UpdateEnvSummary, this.getSummary());
    }

    /**
     * @returns {EnvSummary}
     */
    getSummary() {
        return {
            id: this.id,
            slug: this.slug,
            path: this.path,
            name: this.name,
            icon: this.icon,
            color: this.color,
        };
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    getDirectoryContents(data) {
        const relDirPath = path.normalize(path.join(path.sep, data.path));
        const nixDirPath = upath.toUnix(relDirPath);
        const fullDirPath = path.join(this.path, relDirPath);

        return fs.readdir(fullDirPath)
            .then(fileNames => {
                _.remove(fileNames, f => f === OgmaEnvFolder);

                const filePromises = new Array(fileNames.length);
                for (let i = 0; i < fileNames.length; ++i) {
                    const name = fileNames[i];
                    const filePath = path.join(fullDirPath, name);
                    filePromises[i] = Promise.resolve()
                        .then(() => fs.lstat(filePath))
                        .then(stats => {
                            const data = path.parse(name);
                            const isDir = stats.isDirectory();

                            const nixPath = upath.join(nixDirPath, name);
                            const hash = Util.getMd5(nixPath);

                            let thumbState = ThumbnailState.Impossible;
                            if (!isDir) {
                                if (this.thumbManager.canHaveThumbnail({path: nixPath})) {
                                    thumbState = ThumbnailState.Possible;
                                    if (this.thumbManager.checkThumbnailSync({hash, stats})) {
                                        thumbState = ThumbnailState.Ready;
                                    }
                                }
                            }

                            return {
                                hash,
                                nixPath,
                                base: data.base,
                                ext: isDir ? '' : data.ext,
                                name: isDir ? data.base : data.name,

                                isDir,
                                thumb: thumbState,
                            };
                        });
                }

                return Promise.all(filePromises);
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    openFile(data) {
        const normPath = path.normalize(path.join(path.sep, data.path));
        const fullPath = path.join(this.path, normPath);
        shell.openItem(fullPath);
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    openInExplorer(data) {
        const normPath = path.normalize(path.join(path.sep, data.path));
        const fullPath = path.join(this.path, normPath);
        shell.showItemInFolder(fullPath);
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    removeFile(data) {
        const normPath = path.normalize(path.join(path.sep, data.path));
        const fullPath = path.join(this.path, normPath);
        return trash(fullPath)
            .then(() => {
                this.emitter.emit(BackendEvents.EnvRemoveFile, {id: this.id, path: upath.toUnix(normPath)});
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    getThumbnail(data) {
        const normPath = path.normalize(path.join(path.sep, data.path));
        return this.thumbManager.getOrCreateThumbnail({path: normPath});
    }

    getThumbsDir() {
        return this.thumbsDir;
    }

    close() {
        this.thumbManager.close();
        this.db.close();
    }

}

module.exports = Environment;
