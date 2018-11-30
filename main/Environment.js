/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const Database = require('better-sqlite3');

class Environment {

    /**
     * @param {object} data
     * @param {string} data.dbFilePath
     * @param {any} [data.db]
     */
    constructor(data) {
        if (!data.dbFilePath)
            throw new Error('Environment constructor requires dbFilePath!');

        this.dbFilePath = data.dbFilePath;
        this.db = data.db ? data.db : new Database(this.dbFilePath);

        this.propInsert = this.db.prepare('INSERT INTO properties(name, value) VALUES(?, ?)');
        this.propInsert = this.propInsert.run.bind(this.propInsert);

        this.propSelect = this.db.prepare('SELECT value FROM properties WHERE name = ?');
        this.propSelect.pluck(true);
        this.propSelect = this.propSelect.get.bind(this.propSelect);

        const propUpdate = this.db.prepare('UPDATE properties SET value = ? WHERE name = ?');
        this.propUpdate = (a, b) => propUpdate.run(b, a);
    }

    isHidden() {
        const hiddenVal = this.propSelect('env_hidden');
        return hiddenVal === 'true';
    }

    /**
     * @returns {EnvSummary}
     */
    getSummary() {
        return {
            id: this.propSelect('env_id'),
            name: this.propSelect('env_name'),
            code: this.propSelect('env_code'),
            root: this.propSelect('env_root'),
            icon: this.propSelect('env_icon'),
            colour: this.propSelect('env_colour'),
            dbFilePath: this.dbFilePath,
        };
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
     * @param {string} data.dbFilePath
     */
    static create(data) {
        const db = Database(data.dbPath);

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
        propInsert.run('env_id', data.envId);
        propInsert.run('env_name', data.envName);
        propInsert.run('env_root', data.envRoot);
        if (data.envIcon) propInsert.run('env_icon', data.envIcon);
        propInsert.run('env_colour', data.envColour);
        propInsert.run('env_hidden', 'false');

        return new Environment({dbFilePath: data.dbFilePath, db});
    }

    close() {
        this.db.close();
    }


}

module.exports = Environment;
