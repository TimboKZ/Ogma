/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const Database = require('better-sqlite3');

const Util = require('../helpers/Util');

const logger = Util.getLogger();
const LatestDbVersion = 1;

class EnvironmentRepo {

    /**
     * @param {object} data
     * @param {string} data.dbPath Absolute path to DB file
     */
    constructor(data) {
        this._dbPath = data.dbPath;
        this._sqlDir = path.join(__dirname, 'sql');
        this._schemaPath = path.join(this._sqlDir, 'env-schema.sql');
    }

    init() {
        this._db = new Database(this._dbPath);
        this._initSchema();
        this._runAutoMigration();
        this._initPropMethods();
        this._initEntityMethods();
        this._initTagMethods();
        this._initRelationMethods();
    }

    close() {
        this._db.close();
    }

    _runSqlFile(filePath) {
        const db = this._db;
        const sql = fs.readFileSync(filePath, 'utf8').toString();
        db.exec(sql);
    }

    _initSchema() {
        const db = this._db;
        db.pragma('foreign_keys = on');

        // Initialize schema
        this._runSqlFile(this._schemaPath);
    }

    // noinspection JSMethodCanBeStatic
    _runAutoMigration() {
        const db = this._db;

        /** @type {function(): number} */
        this.getVersion = Util.prepSqlGet(db, 'SELECT version FROM version LIMIT 1', true);
        /** @type {function(version: number): void} */
        this._setVersion = Util.prepSqlRun(db, 'REPLACE INTO version VALUES (?)');

        let version = this.getVersion();
        if (!version) {
            this._setVersion(1);
            version = 1;
        }

        if (version === LatestDbVersion) return;
        logger.info(`Migrating environment DB file: ${this._dbPath}`);
        logger.info(`Current DB version: ${version}. Latest version: ${LatestDbVersion}.`);

        // Alpha -> v1
        if (version === 0) {
            logger.info('Migrating from alpha to v1...');
            this._runSqlFile(path.join(this._sqlDir, 'm-alpha-1.sql'));
            logger.info('Migrated to v1.');
            this._setVersion(1);
            version = 1;
        }

        // Check if we reached the latest version.
        if (version === LatestDbVersion) {
            logger.info(`Finished DB file migration. Current version: ${version}.`);
        } else {
            const errorMessage = `DB migration incomplete - could not reach v${LatestDbVersion}! Current version: ${version}.`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    _initPropMethods() {
        const db = this._db;

        /** @type {function(name: string): string} */
        this.getProperty = Util.prepSqlGet(db, 'SELECT value FROM properties WHERE name = ?', true);
        /** @type {function(name: string, value: any): void} */
        this.setProperty = Util.prepSqlRun(db, 'REPLACE INTO properties VALUES (?, ?)');
    }

    _initEntityMethods() {
        const db = this._db;

        /**
         * @param {*} entity
         * @returns {DBEntity}
         */
        const _parseEntityBoolean = entity => {
            if (!entity) return entity;
            // noinspection EqualityComparisonWithCoercionJS,JSIncompatibleTypesComparison
            entity.isDir = entity.isDir == 1;
            return entity;
        };

        const _selectAllEntities = Util.prepSqlAll(db, 'SELECT * FROM entities');
        /** @type {function(): DBEntity[]} */
        this.selectAllEntities = () => _selectAllEntities().map(_parseEntityBoolean);
        const _selectAllSinks = Util.prepSqlAll(db, 'SELECT * FROM entities WHERE isDir = 1');
        /** @type {function(): DBEntity[]} */
        this.selectAllSinks = () => _selectAllSinks().map(_parseEntityBoolean);
        /** @type {function(): DBEntity[]} */
        this.selectAllSinksWithTagIds = Util.prepTransaction(db, () => {
            const sinks = this.selectAllSinks();
            const sinksWithTags = new Array(sinks.length);
            for (let i = 0; i < sinks.length; ++i) {
                const sink = sinks[i];
                sinksWithTags[i] = sink;
                sinksWithTags[i].tagIds = this.selectTagIdsByEntityId(sink.id);
            }
            return sinksWithTags;
        });
        /** @type {function(entityIds: string[]): (DBEntity|null)[]} */
        this.selectAllSinksWithTagIdsByIds = Util.prepTransaction(db, entityIds => {
            const sinksWithTags = new Array(entityIds.length);
            for (let i = 0; i < entityIds.length; ++i) {
                const sink = _parseEntityBoolean(this.selectEntityById(entityIds[i]));
                if (sink && sink.isDir) {
                    sinksWithTags[i] = sink;
                    sinksWithTags[i].tagIds = this.selectTagIdsByEntityId(sink.id);
                } else {
                    sinksWithTags[i] = null;
                }
            }
            return sinksWithTags;
        });
        const _selAllEntsByPathPref = Util.prepSqlAll(db, 'SELECT * FROM entities WHERE nixPath LIKE (? || \'/%\')');
        /** @type {function(nixPathPrefix: string): DBEntity[]} */
        this.selectAllEntitiesByDir = nixPathPrefix => _selAllEntsByPathPref(nixPathPrefix).map(_parseEntityBoolean);
        /** @type {function(): DBEntity[]} */
        this.selectAllEntitiesAndTagIDs = Util.prepTransaction(db, () => {
            const fullEntities = this.selectAllEntities();
            const entitiesWithTagIds = new Array(fullEntities.length);
            for (let i = 0; i < fullEntities.length; ++i) {
                const entity = fullEntities[i];
                entitiesWithTagIds[i] = _parseEntityBoolean(entity);
                entitiesWithTagIds[i].tagIds = this.selectTagIdsByEntityId(entity.id);
            }
            return entitiesWithTagIds;
        });

        /** @type {function(id: string): string|null} */
        this.selectEntityById = Util.prepSqlGet(db, 'SELECT * FROM entities WHERE id = ?');
        /** @type {function(id: string): string|null} */
        this.selectEntityPathById = Util.prepSqlGet(db, 'SELECT nixPath FROM entities WHERE id = ?', true);
        /** @type {function(ids: string[]): string[]} */
        this.selectEntityPathsByIds = Util.prepTransaction(db, ids => {
            const nixPaths = new Array(ids.length);
            for (let i = 0; i < ids.length; ++i) nixPaths[i] = this.selectEntityPathById(ids[i]);
            return nixPaths;
        });
        const _selectEntityByHash = Util.prepSqlGet(db, 'SELECT * FROM entities WHERE hash = ?');
        /** @param {string} hash */
        this.selectEntityByHash = hash => _parseEntityBoolean(_selectEntityByHash(hash));
        /** @type {function(hashes: string[]): DBEntity[]} */
        this.selectMultipleEntitiesByHashes = Util.prepTransaction(db, hashes => {
            const entities = new Array(hashes.length);
            for (let i = 0; i < entities.length; ++i) {
                entities[i] = this.selectEntityByHash(hashes[i]);
            }
            return entities;
        });
        /** @type {function(hash: string): string|null} */
        this.selectEntityIdByHash = Util.prepSqlGet(db, 'SELECT id FROM entities WHERE hash = ?', true);

        const _insertEntity = Util.prepSqlRun(db, 'INSERT INTO entities VALUES(?, ?, ?, ?)');
        /** @type {function(id: string, hash: string, nixPath: string, isDir: boolean): void} */
        this.insertEntity = (id, hash, nixPath, isDir) => _insertEntity(id, hash, nixPath, isDir ? 1 : 0);
        /** @type {function(DBEntity[]): void} */
        this.insertMultipleEntities = Util.prepTransaction(db, (entities) => {
            for (const entity of entities) this.insertEntity(entity.id, entity.hash, entity.nixPath, entity.isDir);
        });

        const updateEntityHash = Util.prepSqlRun(db, 'UPDATE entities SET hash = ?, nixPath = ? WHERE hash = ?');
        /** @type {function(oldHash: string, newHash: string, newNixPath: string): void} */
        this.updateEntityHash = (oldHash, newHash, newNixPath) => updateEntityHash(newHash, newNixPath, oldHash);
        /** @type {function(oldNixPath: string, newNixPath: string): {deletedHashes: string[], slimEntities: DBSlimEntity[]}} */
        this.updateChildEntityPathsWithDiff = Util.prepTransaction(db, (oldNixPath, newNixPath) => {
            const entities = this.selectAllEntitiesByDir(oldNixPath);
            const deletedHashes = new Array(entities.length);
            const slimEntities = new Array(entities.length);
            for (let i = 0; i < entities.length; ++i) {
                const entity = entities[i];
                const oldHash = entity.hash;
                const newPath = `${newNixPath}${entity.nixPath.substring(oldNixPath.length)}`;
                const newHash = Util.fileHash(newPath);
                this.updateEntityHash(oldHash, newHash, newPath);

                deletedHashes[i] = oldHash;
                slimEntities[i] = {id: entity.id, hash: newHash};
            }
            return {deletedHashes, slimEntities};
        });

        /** @type {function(id: string): void} */
        this.deleteEntityById = Util.prepSqlRun(db, 'DELETE FROM entities WHERE id = ?');
        /** @type {function(ids: string[]): void} */
        this.deleteMultipleEntitiesByIds = Util.prepTransaction(db, entityIds => {
            for (const id of entityIds) this.deleteEntityById(id);
        });
    }

    _initTagMethods() {
        const db = this._db;

        /** @type {function(): DBTag[]} */
        this.selectAllTags = Util.prepSqlAll(db, 'SELECT * FROM tags');
        /** @type {function(name: string): string|null} */
        this.selectTagIdByName = Util.prepSqlGet(db, 'SELECT id FROM tags WHERE name = ? COLLATE NOCASE LIMIT 1', true);
        /** @type {function(names: string[]): {tagIds: string[], missingIndices: number[]}} */
        this.selectMultipleTagIdsByNames = Util.prepTransaction(db, names => {
            const tagIds = new Array(names.length);
            const missingIndices = [];
            for (let i = 0; i < names.length; ++i) {
                tagIds[i] = this.selectTagIdByName(names[i]);
                if (!tagIds[i]) missingIndices.push(i);
            }
            return {tagIds, missingIndices};
        });

        /** @type {function(id: string, name: string, color: string): void} */
        this.insertTag = Util.prepSqlRun(db, 'INSERT INTO tags VALUES(?, ?, ?)');
        /** @type {function(DBTag[]): void} */
        this.insertMultipleTags = Util.prepTransaction(db, tags => {
            for (const tag of tags) {
                this.insertTag(tag.id, tag.name, tag.color);
            }
        });
    }

    _initRelationMethods() {
        const db = this._db;

        /** @type {function(id: string): string[]} */
        this.selectTagIdsByEntityId = Util.prepSqlAll(db, 'SELECT tagId FROM entity_tags WHERE entityId = ?', true);
        // TODO: Fix the type mess below - name doesn't match return value, which doesn't match JSDoc...
        /** @type {function(hash: string): DBSlimEntity} */
        this.selectEntityIdAndTagIdsByFileHash = hash => {
            const entityId = this.selectEntityIdByHash(hash);
            let tagIds = [];
            if (entityId) tagIds = this.selectTagIdsByEntityId(entityId);
            return {id: entityId, hash, tagIds};
        };

        /** @type {function(entityId: string, tagId: string): void} */
        this.setEntityTag = Util.prepSqlRun(db, 'REPLACE INTO entity_tags VALUES (?, ?)');
        /** @type {function(entityIds: string[], tagIds: string[]): void} */
        this.setMultipleEntityTags = Util.prepTransaction(db, (entityIds, tagIds) => {
            for (const entId of entityIds) for (const tagId of tagIds) this.setEntityTag(entId, tagId);
        });

        /** @type {function(entityId: string, tagId: string): void} */
        this.deleteEntityTag = Util.prepSqlRun(db, 'DELETE FROM entity_tags WHERE entityId = ? AND tagId=  ?');
        /** @type {function(entityIds: string[], tagIds: string[]): void} */
        this.deleteMultipleEntityTags = Util.prepTransaction(db, (entityIds, tagIds) => {
            for (const entId of entityIds) for (const tagId of tagIds) this.deleteEntityTag(entId, tagId);
        });
        /** @type {function(entityId: string): void} */
        this.deleteEntityTagByEntityId = Util.prepSqlRun(db, 'DELETE FROM entity_tags WHERE entityId = ?');
        /** @type {function(entityIds: string[]): void} */
        this.deleteMultipleEntityTagsByEntityIds = Util.prepTransaction(db, entityIds => {
            for (const entId of entityIds) this.deleteEntityTagByEntityId(entId);
        });
    }

}

module.exports = EnvironmentRepo;
