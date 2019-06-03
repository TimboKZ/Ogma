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
        db.pragma('foreign_keys = on');

        // Create tables for all necessary data
        db.exec('CREATE TABLE IF NOT EXISTS properties (name TEXT PRIMARY KEY, value TEXT)');
        db.exec('CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, hash TEXT UNIQUE, filePath TEXT UNIQUE)');
        db.exec(`CREATE TABLE IF NOT EXISTS tags
                 (
                     id  TEXT PRIMARY KEY,
                     name   TEXT,
                     color TEXT
                 )`);
        db.exec(`CREATE TABLE IF NOT EXISTS entity_tags
                 (
                     entityId TEXT,
                     tagId    TEXT,
                     UNIQUE (entityId, tagId),
                     FOREIGN KEY (entityId) REFERENCES entities (id),
                     FOREIGN KEY (tagId) REFERENCES tags (id)
                 )`);

        // Setup get and set commands
        this._setProperty = Util.prepSqlRun(db, 'REPLACE INTO properties VALUES (?, ?)');
        this._getProperty = Util.prepSqlGet(db, 'SELECT value FROM properties WHERE name = ?', true);

        this._selectEntityIdByHash = Util.prepSqlGet(db, 'SELECT id FROM entities WHERE hash = ?', true);
        this._insertEntity = Util.prepSqlRun(db, 'INSERT INTO entities VALUES(?, ?, ?)');

        this._selectAllTags = Util.prepSqlAll(db, 'SELECT * FROM tags');
        this._insertTag = Util.prepSqlRun(db, 'INSERT INTO tags VALUES(?, ?, ?)');
        this._selectTagById = Util.prepSqlGet(db, 'SELECT * FROM tags WHERE id = ?');
        this._insertTagsIfNotExists = db.transaction((ids, names) => {
            for (let i = 0; i < ids.length; ++i) {
                const id = ids[i];
                if (this._selectTagById(id)) continue;
                const name = names[i];
                const color = _.sample(Colors);
                this._insertTag(id, name, color);
            }
        });

        this._setEntityTag = Util.prepSqlRun(db, 'REPLACE INTO entity_tags VALUES (?, ?)');
        this._setMultipleEntityTags = db.transaction((entityIds, tagIds) => {
            for (const entId of entityIds) for (const tagId of tagIds) this._setEntityTag(entId, tagId);
        });
        this._selectEntityIdsByTagId = Util.prepSqlAll(db, 'SELECT entityId FROM entity_tags WHERE tagId = ?', true);
        this._selectTagIdsByEntityId = Util.prepSqlAll(db, 'SELECT tagId FROM entity_tags WHERE entityId = ?', true);
        this._selectTagIdsByFileHash = hash => {
            const entityId = this._selectEntityIdByHash(hash);
            if (!entityId) return [];
            else return this._selectTagIdsByEntityId(entityId);
        };

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
     * @param {string[]} data.nixPaths Array of relative paths of the file (from environment root)
     */
    _getOrDefineEntityIDs(data) {
        // TODO: Emit events when new entities are created.
        const nixPaths = data.nixPaths;
        return Promise.resolve()
            .then(() => {
                const hashes = _.map(nixPaths, p => Util.getFileHash(p));
                const entityIds = new Array(hashes.length);
                for (let i = 0; i < hashes.length; ++i) {
                    const hash = hashes[i];
                    const nixPath = nixPaths[i];
                    const entity = this._selectEntityIdByHash(hash);
                    if (entity) {
                        logger.debug(`Entity exists for ${nixPath}`);
                        entityIds[i] = entity.id;
                    } else {
                        logger.debug(`Entity does not exist ${nixPath}`);
                        const id = Util.getShortId();
                        this._insertEntity(id, hash, nixPath);
                        entityIds[i] = id;
                    }
                }
                return entityIds;
            });
    }

    getAllTags() {
        return this._selectAllTags();
    }

    /**
     * @param {object} data
     * @param {string[]} data.tagNames
     */
    _getOrDefineTagIDs(data) {
        // TODO: Emit events when new tags are created.
        return Promise.resolve()
            .then(() => {
                const tagNames = _.map(data.tagNames, s => s.trim());
                const tagIds = _.map(tagNames, n => Util.getTagId(n.toLowerCase()));
                this._insertTagsIfNotExists(tagIds, tagNames);
                return tagIds;
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.tagNames Names of tags to add
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    addTagsToFiles(data) {
        // TODO: Emit events that tags were assigned.
        const tagNames = data.tagNames;
        const nixPaths = _.map(data.paths, Util.getEnvNixPath);
        const promises = [
            this._getOrDefineEntityIDs({nixPaths}),
            this._getOrDefineTagIDs({tagNames}),
        ];
        return Promise.all(promises)
            .then(result => {
                const [entityIds, tagIds] = result;
                this._setMultipleEntityTags(entityIds, tagIds);
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    getDirectoryContents(data) {
        const relDirPath = Util.getEnvPath(data.path);
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
                            const hash = Util.getFileHash(nixPath);

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
                                tagIds: this._selectTagIdsByFileHash(hash),
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
     * @param {string[]} data.paths Array of paths relative to environment root
     */
    removeFiles(data) {
        const normPaths = _.map(data.paths, p => path.normalize(path.join(path.sep, p)));
        const nixPaths = _.map(normPaths, p => upath.toUnix(p));
        const fullPaths = _.map(normPaths, p => path.join(this.path, p));
        return trash(fullPaths)
            .then(() => {
                const hashes = _.map(nixPaths, p => Util.getFileHash(p));
                this.emitter.emit(BackendEvents.EnvRemoveFiles, {id: this.id, hashes, paths: nixPaths});

                // TODO: Remove thumbnails from all children of a folder!
                _.map(hashes, hash => this.thumbManager.removeThumbnail({hash}).catch(logger.error));
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
