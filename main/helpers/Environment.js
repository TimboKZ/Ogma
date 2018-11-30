/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const Database = require('better-sqlite3');

const {EnvProperty} = require('../../shared/typedef');

class Environment {

    /**
     * @param {object} data
     * @param {string} data.dbFile
     * @param {any} [data.db]
     */
    constructor(data) {
        if (!data.dbFile)
            throw new Error('Environment constructor requires dbFilePath!');

        this.dbFile = data.dbFile;
        this.db = data.db ? data.db : new Database(this.dbFile);

        const set = this.db.prepare('REPLACE INTO properties VALUES (?, ?)');
        const get = this.db.prepare('SELECT value FROM properties WHERE name = ?');
        get.pluck(true);

        /**
         * @param {string} name
         * @param {string} value
         */
        this.set = (name, value) => set.run(name, value);
        /**
         * @param {string} name
         * @returns {string|null}
         */
        this.get = name => get.get(name);
    }

    isHidden() {
        const stringVal = this.get(EnvProperty.isHidden);
        return stringVal === 'true';
    }

    /**
     * @returns {EnvSummary}
     */
    getSummary() {
        const envSummary = {};

        // Process all cases, special and non special as strings
        const propertyNames = Object.keys(EnvProperty);
        for (const name of propertyNames) {
            envSummary[name] = this.get(name);
        }

        // Process special cases again, now separately.
        envSummary[EnvProperty.dbFile] = this.dbFile;
        envSummary[EnvProperty.isHidden] = this.isHidden();

        return envSummary;
    }

    getTags() {

    }

    /**
     * @param {object} data
     * @param {string} data.envName
     * @param {string} data.envId
     * @param {string} data.envRoot
     * @param {string} [data.envIcon]
     * @param {string} data.envColour
     * @param {string} data.dbFile
     */
    static create(data) {
        const db = Database(data.dbFile);

        // Create tables for all necessary data
        db.exec('CREATE TABLE properties (name TEXT PRIMARY KEY, value TEXT)');
        db.exec('CREATE TABLE files (file_id TEXT PRIMARY_KEY, path TEXT UNIQUE)');
        db.exec('CREATE TABLE collections (collection_id TEXT PRIMARY KEY , name TEXT, colour TEXT)');
        db.exec(`CREATE TABLE tags
                 (
                   tag_id     TEXT PRIMARY_KEY,
                   name       TEXT,
                   colour     TEXT,
                   collection TEXT,
                   FOREIGN KEY (collection) REFERENCES collections (collection_id)
                 )`);

        // Populate environment properties table
        const propInsert = db.prepare('INSERT INTO properties(name, value) VALUES(?, ?)');
        propInsert.run(EnvProperty.id, data.envId);
        propInsert.run(EnvProperty.name, data.envName);
        propInsert.run(EnvProperty.root, data.envRoot);
        if (data.envIcon) propInsert.run(EnvProperty.icon, data.envIcon);
        propInsert.run(EnvProperty.colour, data.envColour);
        propInsert.run(EnvProperty.isHidden, 'false');

        return new Environment({dbFile: data.dbFile, db});
    }

    close() {
        this.db.close();
    }


}

module.exports = Environment;
