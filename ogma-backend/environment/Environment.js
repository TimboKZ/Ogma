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

const Util = require('../helpers/Util');
const FileManager = require('../fs/FileManager');
const EnvironmentRepo = require('../db/EnvironmentRepo');
const ThumbnailManager = require('../fs/ThumbnailManager');
const {OgmaEnvFolder, BackendEvents, EnvProperty, Colors, FileErrorStatus, ThumbnailState} = require('../../shared/typedef');

const logger = Util.getLogger();

class Environment {

    /**
     * @param {object} data
     * @param {OgmaCore} data.ogmaCore
     * @param {AbsPath} data.path
     * @param {EnvironmentManager} data.envManager
     * @param {boolean} [data.allowCreate]
     */
    constructor(data) {
        // Instance variables
        this.path = data.path;
        this.allowCreate = !!data.allowCreate;
        this.dirName = path.basename(this.path);
        this.confDir = path.join(this.path, OgmaEnvFolder);
        this.dbPath = path.join(this.confDir, 'data.sqlite3');
        this.thumbsDir = path.join(this.confDir, 'thumbnails');
        const thumbsDbPath = path.join(this.confDir, 'thumbs.sqlite3');

        // References passed from parent
        this.ogmaCore = data.ogmaCore;
        this.envManager = data.envManager;
        this.emitter = this.ogmaCore.emitter;

        // New helper instances
        this.envRepo = new EnvironmentRepo({dbPath: this.dbPath});
        this.fileManager = new FileManager({root: this.path});
        this.thumbManager = new ThumbnailManager({
            environment: this,
            thumbsDir: this.thumbsDir,
            thumbsDbPath,
            basePath: this.path,
        });

        // Data structures for algorithms
        this.rootSinks = [];
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
        this._prepareSinkTree();
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

    _prepareSinkTree() {
        const sinks = this.envRepo.selectAllSinksWithTagIds();
        const fsTree = {children: {}};
        for (const sink of sinks) {
            const {id, nixPath, tagIds} = sink;
            if (nixPath === '/') continue;
            const parts = nixPath.substring(1).split('/');
            if (parts.length === 0) continue;
            let prevLevel = fsTree;
            for (let i = 0; i < parts.length; ++i) {
                const part = parts[i];
                const lastPart = i === parts.length - 1;
                let level = prevLevel.children[part];
                if (!level) {
                    level = {
                        tagIds: [],
                        children: {},
                    };
                    prevLevel.children[part] = level;
                }
                if (lastPart) {
                    level.sinkId = id;
                    level.nixPath = nixPath;
                }
                level.tagIds = _.union(level.tagIds, tagIds);
                prevLevel = level;
            }
        }

        const parseRoot = root => {
            const childDirs = Object.keys(root.children);
            let sinks = [];
            for (const dirName of childDirs) {
                const child = root.children[dirName];
                const childSinks = parseRoot(child);
                if (child.tagIds.length > 0) {
                    const tagMap = {};
                    for (const tagId of child.tagIds) tagMap[tagId] = true;
                    sinks.push({
                        tagMap,
                        sinkId: child.sinkId,
                        nixPath: child.nixPath,
                        sinks: childSinks,
                    });
                } else {
                    sinks = sinks.concat(childSinks);
                }
            }
            return sinks;
        };
        this.rootSinks = parseRoot(fsTree);
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
     * @returns {Promise.<DBSlimEntity[]>}
     */
    _getOrDefineSlimEntities(data) {
        const nixPaths = data.nixPaths;
        return Promise.resolve()
            .then(() => {
                const hashes = data.hashes || _.map(nixPaths, Util.fileHash);
                // TODO: Replace with Denque, cos why not?
                const entitiesToInsert = [];
                const newSlimEntities = [];
                const slimEntities = new Array(hashes.length);
                for (let i = 0; i < hashes.length; ++i) {
                    const hash = hashes[i];
                    const nixPath = nixPaths[i];
                    const entity = this.envRepo.selectEntityByHash(hash);
                    if (entity) {
                        const {id, hash, isDir} = entity;
                        slimEntities[i] = {id, hash, isDir};
                    } else {
                        const id = Util.getShortId();

                        const filePath = path.join(this.path, nixPath);
                        const isDir = fs.lstatSync(filePath).isDirectory();

                        const slimEntity = {id, hash, isDir};
                        slimEntities[i] = slimEntity;
                        newSlimEntities.push(slimEntity);
                        entitiesToInsert.push({id, hash, nixPath, isDir});
                    }
                }
                this.envRepo.insertMultipleEntities(entitiesToInsert);

                this.emitter.emit(BackendEvents.EnvUpdateEntities, {id: this.id, entities: newSlimEntities});
                return slimEntities;
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
        const nixPaths = _.map(data.paths, Util.nixPath);
        const hashes = _.map(nixPaths, Util.fileHash);
        const promises = [
            this._getOrDefineSlimEntities({hashes, nixPaths}),
            this._getOrDefineTagIDs({tagNames}),
        ];
        return Promise.all(promises)
            .then(result => {
                const [slimEntities, tagIds] = result;
                const entityIds = slimEntities.map(e => e.id);
                this.envRepo.setMultipleEntityTags(entityIds, tagIds);
                this.emitter.emit(BackendEvents.EnvTagFiles, {id: this.id, entities: slimEntities, tagIds});

                if (_.find(slimEntities, e => e.isDir) !== -1) this._prepareSinkTree();
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
                const hash = Util.fileHash(nixPath);

                let thumbName = null;
                let thumbState = ThumbnailState.Impossible;
                if (!isDir) {
                    if (this.thumbManager.canHaveThumbnail({path: nixPath})) {
                        thumbState = ThumbnailState.Possible;
                        thumbName = this.thumbManager.tryThumbnailSync({hash, stats});
                        if (thumbName) thumbState = ThumbnailState.Ready;
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
                    thumbName,
                    thumbState,
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
     * @param {string} data.paths Paths to files that will be sorted to sinks.
     */
    moveFilesToSinks(data) {
        const normPaths = _.map(data.paths, p => Util.getEnvPath(p));
        const nixPaths = _.map(normPaths, p => upath.toUnix(p));
        const hashes = _.map(nixPaths, p => Util.fileHash(p));
        const entities = this.envRepo.selectMultipleEntitiesByHashes(hashes).filter(e => e && !e.isDir);

        const getDeepestSink = (sinks, tagIds, depth) => {
            let bestDepth = 0;
            let bestSink = null;
            for (const sink of sinks) {
                const tagMap = sink.tagMap;
                let matchedTag = false;
                if (tagMap) {
                    for (const tagId of tagIds) {
                        if (tagMap[tagId]) {
                            matchedTag = true;
                            break;
                        }
                    }
                }
                if (!matchedTag) continue;
                bestDepth = depth;
                bestSink = {nixPath: sink.nixPath, depth};
                const childSink = getDeepestSink(sink.sinks, tagIds, depth + 1);
                if (!childSink) continue;
                if (childSink.depth > bestDepth) {
                    bestDepth = childSink.depth;
                    bestSink = childSink;
                }
            }
            return bestSink;
        };

        const renamePromises = new Denque();
        for (let i = 0; i < entities.length; ++i) {
            const entity = entities[i];
            const tagIds = this.envRepo.selectTagIdsByEntityId(entity.id);
            const sink = getDeepestSink(this.rootSinks, tagIds, 1);
            if (!sink) continue;

            const oldPath = entity.nixPath;
            const newPath = upath.join(sink.nixPath, path.basename(oldPath));

            if (newPath === oldPath) continue;
            // console.log(oldPath, ' --> ', newPath);
            renamePromises[i] = this.renameFile({oldPath, newPath});
        }

        return Promise.all(renamePromises.toArray())
            .then(() => undefined);
    }

    /**
     * @param {object} data
     * @param {EnvPath} data.oldPath Current path to the file.
     * @param {EnvPath} data.newPath New path to the file.
     * @param {boolean} [data.overwrite=false] Whether to overwrite if the new file already exists
     */
    renameFile(data) {
        const {oldPath, newPath} = data;
        const oldNixPath = Util.nixPath(oldPath);
        const oldHash = Util.fileHash(oldNixPath);
        const newNixPath = Util.nixPath(newPath);
        const newHash = Util.fileHash(newNixPath);

        return this.fileManager.renameFile({oldPath, newPath})
            .then(() => {
                // Try to update entity by hash, even if it doesn't exist.
                this.envRepo.updateEntityHash(oldHash, newHash, newNixPath);

                return this.thumbManager.renameFile({oldNixPath, newNixPath})
                    .catch(error => logger.error('Error occurred while renaming thumbnails:', error));
            })
            .then(() => this.getFileDetails({path: newNixPath}))
            .then(fileDetails => {
                // Update hashes and paths of all affected child entities
                let deletedHashes = [];
                let slimEntities;
                if (fileDetails.isDir) {
                    const entityDiff = this.envRepo.updateChildEntityPathsWithDiff(oldNixPath, newNixPath);
                    deletedHashes = entityDiff.deletedHashes;
                    slimEntities = entityDiff.slimEntities;
                }
                deletedHashes.push(oldHash);

                // Emit relevant events
                this.emitter.emit(BackendEvents.EnvRemoveFiles, {id: this.id, hashes: deletedHashes});
                this.emitter.emit(BackendEvents.EnvAddFiles, {id: this.id, file: fileDetails});
                if (slimEntities) {
                    this.emitter.emit(BackendEvents.EnvUpdateEntities, {id: this.id, entities: slimEntities});
                }
            });
    }

    /**
     * @param {object} data
     * @param {string[]} data.paths Array of paths relative to environment root
     */
    removeFiles(data) {
        const {paths} = data;
        const normPaths = paths.map(p => Util.getEnvPath(p));
        const fullPaths = normPaths.map(p => path.join(this.path, p));
        return trash(fullPaths)
            .then(() => {
                const nixPaths = normPaths.map(p => upath.toUnix(p));
                const hashes = nixPaths.map(p => Util.fileHash(p));

                // Delete direct hashes
                this.emitter.emit(BackendEvents.EnvRemoveFiles, {id: this.id, hashes});

                const delEntityQueue = new Denque();
                for (let i = 0; i < hashes.length; ++i) {
                    const hash = hashes[i];
                    const nixPath = nixPaths[i];

                    const entityId = this.envRepo.selectEntityIdByHash(hash);
                    if (entityId) delEntityQueue.push(entityId);

                    const childEntities = this.envRepo.selectAllEntitiesByDir(nixPath);
                    for (const ent of childEntities) delEntityQueue.push(ent.id);

                    // Delete relevant thumbnails
                    this.thumbManager.removeFile({hash, nixPath})
                        .catch(error => logger.error('Error occurred while deleting thumbnails:', error));
                }

                this.removeEntitiesSync({entityIds: delEntityQueue.toArray()});
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
        return null;
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
