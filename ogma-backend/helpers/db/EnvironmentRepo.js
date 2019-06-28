/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const Database = require('better-sqlite3');

const Util = require('../Util');

const logger = Util.getLogger();

class EnvironmentRepo {

    /**
     * @param {object} data
     * @param {string} data.dbPath Absolute path to DB file
     */
    constructor(data) {
        this.dbPath = data.dbPath;
    }

    init() {
        this._db = new Database(this.dbPath);
        this._initScheme();
        this._initPropMethods();
        this._initEntityMethods();
        this._initTagMethods();
        this._initRelationMethods();
    }

    close() {
        this._db.close();
    }

    _initScheme() {
        const db = this._db;
        db.pragma('foreign_keys = on');

        // Create tables for all necessary data
        db.exec('CREATE TABLE IF NOT EXISTS properties (name TEXT PRIMARY KEY, value TEXT)');
        db.exec('CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, hash TEXT UNIQUE, nixPath TEXT UNIQUE)');
        db.exec(`CREATE TABLE IF NOT EXISTS tags
                 (
                     id    TEXT PRIMARY KEY,
                     name  TEXT,
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
    }

    _initPropMethods() {
        const db = this._db;

        /** @type {function(name: string, value: any): void} */
        this.setProperty = Util.prepSqlRun(db, 'REPLACE INTO properties VALUES (?, ?)');
        /** @type {function(name: string): string} */
        this.getProperty = Util.prepSqlGet(db, 'SELECT value FROM properties WHERE name = ?', true);
    }

    _initEntityMethods() {
        const db = this._db;

        /** @type {function(): DBEntity[]} */
        this.selectAllEntities = Util.prepSqlAll(db, 'SELECT * FROM entities');
        /** @type {function(): DBSlimEntity[]} */
        this.selectAllEntityIDsAndTagIDs = Util.prepTransaction(db, () => {
            const fullEntities = this.selectAllEntities();
            const slimEntities = new Array(fullEntities.length);
            for (let i = 0; i < fullEntities.length; ++i) {
                const entity = fullEntities[i];
                slimEntities[i] = {
                    id: entity.id,
                    hash: entity.hash,
                    tagIds: this.selectTagIdsByEntityId(entity.id),
                };
            }
            return slimEntities;
        });
        /** @type {function(string[]): string[]} */
        this.selectEntityPathsByHashes = Util.prepTransaction(db, hashes => {
            const nixPaths = new Array(hashes.length);
            for (let i = 0; i < hashes.length; ++i) nixPaths[i] = this.selectEntityPathByHash(hashes[i]);
            return nixPaths;
        });

        /** @type {function(hash: string): string|null} */
        this.selectEntityIdByHash = Util.prepSqlGet(db, 'SELECT id FROM entities WHERE hash = ?', true);
        /** @type {function(hash: string): string|null} */
        this.selectEntityPathByHash = Util.prepSqlGet(db, 'SELECT nixPath FROM entities WHERE hash = ?', true);

        /** @type {function(id: string, hash: string, nixPath: string): void} */
        this.insertEntity = Util.prepSqlRun(db, 'INSERT INTO entities VALUES(?, ?, ?)');
        /** @type {function(DBEntity[]): void} */
        this.insertMultipleEntities = Util.prepTransaction(db, (entities) => {
            for (const entity of entities) this.insertEntity(entity.id, entity.hash, entity.nixPath);
        });

        const updateEntityHash = Util.prepSqlRun(db, 'UPDATE entities SET hash = ?, nixPath = ? WHERE hash = ?');
        /** @type {function(oldHash: string, newHash: string, newNixPath: string): void} */
        this.updateEntityHash = (oldHash, newHash, newNixPath) => updateEntityHash(newHash, newNixPath, oldHash);
    }

    _initTagMethods() {
        const db = this._db;

        /** @type {function(): void} */
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
    }

}

module.exports = EnvironmentRepo;
