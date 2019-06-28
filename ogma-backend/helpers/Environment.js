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
const Denque = require('denque');
const Promise = require('bluebird');
const {shell} = require('electron');

const Util = require('./Util');
const EnvironmentRepo = require('./db/EnvironmentRepo');
const ThumbnailManager = require('./ThumbnailManager');
const {OgmaEnvFolder, BackendEvents, EnvProperty, Colors, FileErrorStatus, ThumbnailState} = require('../../shared/typedef');

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
        this.envRepo = new EnvironmentRepo({dbPath: this.dbPath});

        this.thumbsDir = path.join(this.confDir, 'thumbnails');
        const thumbsDbPath = path.join(this.confDir, 'thumbs.sqlite3');
        this.thumbManager = new ThumbnailManager({
            environment: this,
            thumbsDir: this.thumbsDir,
            thumbsDbPath,
            basePath: this.path,
        });
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
        this.envRepo.init();

        // Load environment properties
        const getEnvProperty = (property, defaultValueFunc) => {
            let value = this.envRepo.getProperty(property);
            if (value === undefined || value === '') {
                const defaultValue = defaultValueFunc();
                this.envRepo.setProperty(property, defaultValue);
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
            this.envRepo.setProperty(key, value);
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
     * @param {string[]} [data.hashes] File hashes
     * @param {string[]} data.nixPaths Array of relative paths of the file (from environment root)
     */
    _getOrDefineEntityIDs(data) {
        // TODO: Emit events when new entities are created.
        const nixPaths = data.nixPaths;
        return Promise.resolve()
            .then(() => {
                const hashes = data.hashes || _.map(nixPaths, Util.getFileHash);
                const entityIds = new Array(hashes.length);
                // TODO: Replace with Denque, cos why not?
                const entities = [];
                const slimEntities = [];
                for (let i = 0; i < hashes.length; ++i) {
                    const hash = hashes[i];
                    const nixPath = nixPaths[i];
                    const entityId = this.envRepo.selectEntityIdByHash(hash);
                    if (entityId) {
                        entityIds[i] = entityId;
                    } else {
                        const id = Util.getShortId();
                        entities.push({id, hash, nixPath});
                        entityIds[i] = id;
                        slimEntities.push({id, hash});
                    }
                }
                this.envRepo.insertMultipleEntities(entities);

                this.emitter.emit(BackendEvents.EnvUpdateEntities, {id: this.id, entities: slimEntities});
                return entityIds;
            });
    }

    getAllTags() {
        return this.envRepo.selectAllTags();
    }

    /**
     * @param {object} data
     * @param {string[]} data.tagNames
     */
    _getOrDefineTagIDs(data) {
        return Promise.resolve()
            .then(() => {
                const tagNames = _.map(data.tagNames, s => s.trim());
                const {tagIds, missingIndices} = this.envRepo.selectMultipleTagIdsByNames(tagNames);
                const newTags = new Array(missingIndices.length);
                for (let i = 0; i < missingIndices.length; ++i) {
                    const id = Util.getTagId();
                    const index = missingIndices[i];
                    tagIds[index] = id;
                    newTags[i] = {
                        id,
                        name: tagNames[index],
                        color: _.sample(Colors),
                    };
                }
                this.envRepo.insertMultipleTags(newTags);
                this.emitter.emit(BackendEvents.EnvAddTags, {id: this.id, tags: newTags});
                return tagIds;
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.tagNames Names of tags to add
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    addTagsToFiles(data) {
        const tagNames = data.tagNames;
        const nixPaths = _.map(data.paths, Util.getEnvNixPath);
        const hashes = _.map(nixPaths, Util.getFileHash);
        const promises = [
            this._getOrDefineEntityIDs({hashes, nixPaths}),
            this._getOrDefineTagIDs({tagNames}),
        ];
        return Promise.all(promises)
            .then(result => {
                const [entityIds, tagIds] = result;
                this.envRepo.setMultipleEntityTags(entityIds, tagIds);
                this.emitter.emit(BackendEvents.EnvTagFiles, {id: this.id, entityIds, hashes, tagIds});
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.tagIds IDs of tags to remove
     * @param {string[]} data.entityIds Array of entity IDs from which to remove tags
     */
    removeTagsFromFiles(data) {
        this.envRepo.deleteMultipleEntityTags(data.entityIds, data.tagIds);
        this.emitter.emit(BackendEvents.EnvUntagFiles, {id: this.id, entityIds: data.entityIds, tagIds: data.tagIds});
    }

    getAllEntities() {
        return this.envRepo.selectAllEntityIDsAndTagIDs();
    }

    /**
     * @param {object} data
     * @param {string[]} data.entityIds Entity IDs for each file details will be fetched.
     * @returns {Promise.<(FileDetails||FileErrorStatus)[]>}
     */
    getEntityFiles(data) {
        const nixPaths = this.envRepo.selectEntityPathsByIds(data.entityIds);
        const filePromises = new Array(nixPaths.length);
        const badEntityIdQueue = new Denque();
        for (let i = 0; i < nixPaths.length; ++i) {
            const nixPath = nixPaths[i];
            if (!nixPath) {
                filePromises[i] = Promise.resolve(FileErrorStatus.EntityDoesntExist);
                continue;
            }
            filePromises[i] = this.getFileDetails({path: nixPath})
                .catch(error => {
                    if (error.code && error.code === 'ENOENT') {
                        const badEntityId = data.entityIds[i];
                        badEntityIdQueue.push(badEntityId);
                        logger.warn(`Deleting entity '${badEntityId}' - could not find its file at ${nixPath}.`);
                        return FileErrorStatus.FileDoesntExist;
                    }
                    throw error;
                });
        }
        return Promise.all([Promise.all(filePromises)])
            .then(fileDetails => {
                this.removeEntitiesSync({entityIds: badEntityIdQueue.toArray()});
                return fileDetails;
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.entityIds Entity IDs for each file details will be fetched.
     */
    removeEntitiesSync(data) {
        this.envRepo.deleteMultipleEntityTagsByEntityIds(data.entityIds);
        this.envRepo.deleteMultipleEntitiesByIds(data.entityIds);
        this.emitter.emit(BackendEvents.EnvRemoveEntities, {id: this.id, entityIds: data.entityIds});
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     * @returns {Promise<FileDetails>}
     */
    getFileDetails(data) {
        const filePath = path.join(this.path, data.path);
        return fs.lstat(filePath)
            .then(stats => {
                const isDir = stats.isDirectory();

                const nixPath = upath.toUnix(data.path);
                const fileData = upath.parse(nixPath);
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

                const {id: entityId, tagIds} = this.envRepo.selectEntityIdAndTagIdsByFileHash(hash);

                // noinspection UnnecessaryLocalVariableJS
                const fileDetails = {
                    hash,
                    nixPath,
                    base: fileData.base,
                    ext: isDir ? '' : fileData.ext,
                    name: isDir ? fileData.base : fileData.name,

                    isDir,
                    tagIds,
                    entityId,
                    thumb: thumbState,
                };
                return fileDetails;
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    getDirectoryContents(data) {
        const relDirPath = Util.getEnvPath(data.path);
        const fullDirPath = path.join(this.path, relDirPath);

        return fs.readdir(fullDirPath)
            .then(fileNames => {
                _.remove(fileNames, f => f === OgmaEnvFolder);

                const nixDirPath = upath.toUnix(relDirPath);
                const dirPromise = this.getFileDetails({path: nixDirPath});

                const filePromises = new Array(fileNames.length);
                for (let i = 0; i < fileNames.length; ++i) {
                    const name = fileNames[i];
                    const filePath = path.join(relDirPath, name);
                    filePromises[i] = this.getFileDetails({path: filePath});
                }

                return Promise.all([dirPromise, Promise.all(filePromises)]);
            })
            .then(result => ({directory: result[0], files: result[1]}));
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
     * @param {string} data.oldPath Current path to the file, relative to environment root.
     * @param {string} data.newPath New path to the file, relative to environment root.
     * @param {boolean} [data.overwrite=false] Whether to overwrite if the new file already exists
     */
    renameFile(data) {
        return Promise.resolve()
            .then(() => {
                const oldPath = path.join(this.path, data.oldPath);
                if (!fs.existsSync(oldPath)) throw new Error(`The original path does not exist: ${oldPath}`);
                const newPath = path.join(this.path, data.newPath);
                if (!data.overwrite && fs.existsSync(newPath))
                    throw new Error(`Path is already taken! Path: ${newPath}`);

                const oldNixPath = Util.getEnvNixPath(data.oldPath);
                const oldHash = Util.getFileHash(oldNixPath);
                const newNixPath = Util.getEnvNixPath(data.newPath);
                const newHash = Util.getFileHash(newNixPath);

                return fs.rename(oldPath, newPath)
                    .then(() => this.getFileDetails({path: newNixPath}))
                    .then(fileDetails => {
                        let thumbPromise;
                        if (fileDetails.isDir) thumbPromise = this.thumbManager.removeDirectory({nixPath: fileDetails.nixPath});
                        else thumbPromise = this.thumbManager.removeThumbnail({hash: oldHash});
                        thumbPromise.catch(error => logger.error('Error occurred while deleting thumbnails.', error));

                        // Update hash of the current entity
                        if (fileDetails.entityId) this.envRepo.updateEntityHash(oldHash, newHash, newNixPath);

                        // Update hashes and paths of all affected child entities
                        const {deletedHashes, slimEntities} =
                            this.envRepo.updateEntityPathsReturningChanges(oldNixPath, newNixPath);
                        deletedHashes.push(oldHash);

                        // Emit relevant events
                        this.emitter.emit(BackendEvents.EnvRemoveFiles, {id: this.id, hashes: deletedHashes});
                        this.emitter.emit(BackendEvents.EnvAddFiles, {id: this.id, file: fileDetails});
                        this.emitter.emit(BackendEvents.EnvUpdateEntities, {id: this.id, entities: slimEntities});
                    });
            });
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
                this.emitter.emit(BackendEvents.EnvRemoveFiles, {id: this.id, hashes});

                // TODO: Remove thumbnails from all children of a folder!
                _.map(hashes, hash => this.thumbManager.removeThumbnail({hash}).catch(logger.error));
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.paths Array of paths relative to environment root
     */
    requestThumbnails(data) {

        const promises = new Array(data.paths.length);
        for (let i = 0; i < data.paths.length; ++i) {
            const normPath = Util.getEnvPath(data.paths[i]);

            // Request a thumbnail from ThumbnailManager in a separate async branch. Don't make the client wait when
            // it's done.
            promises[i] = this.thumbManager.getOrCreateThumbnail({path: normPath})
                .then(thumbName => {
                    if (!thumbName) return null;
                });
        }
        Promise.all(promises).catch(logger.error);

        // Return here, it's okay if async logic doesn't finish.
    }

    getThumbsDir() {
        return this.thumbsDir;
    }

    close() {
        this.envRepo.close();
        this.thumbManager.close();
    }

}

module.exports = Environment;
