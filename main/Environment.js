/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const Database = require('better-sqlite3');

class Environment {

    /**
     * @param {object} data
     * @param {string} data.dbPath
     */
    constructor(data) {
        this.dbPath = data.dbPath;

        this.db = Database(this.dbPath);

        this.propInsert = this.db.prepare('INSERT INTO properties(name, value) VALUES(?, ?)');
        this.propInsert = this.propInsert.run.bind(this.propInsert);

        this.propSelect = this.db.prepare('SELECT value FROM properties WHERE name = ?');
        this.propSelect.pluck(true);
        this.propSelect = this.propSelect.get.bind(this.propSelect);

        this.propUpdate = this.db.prepare('UPDATE properties SET value = ? WHERE name = ?');
        this.propUpdate = (a, b) => this.propUpdate.run(b, a);
    }

    /**
     * @returns {EnvSummary}
     */
    getSummary() {
        return {
            id: this.propSelect('env_id'),
            name: this.propSelect('env_name'),
            root: this.propSelect('env_root'),
            colour: this.propSelect('env_colour'),
        };
    }

    /**
     * @param {object} data
     * @param {string} data.envName
     * @param {string} data.envId
     * @param {string} data.envRoot
     * @param {string} data.dbPath
     */
    static create(data) {
        const db = Database(data.dbPath);

        // Create tables for all necessary data
        db.exec('CREATE TABLE properties (name TEXT PRIMARY KEY, value TEXT)');
        db.exec('CREATE TABLE files (file_id TEXT PRIMARY_KEY, path TEXT UNIQUE)');
        db.exec('CREATE TABLE tags (tag_id TEXT PRIMARY_KEY, name TEXT, colour TEXT, parent TEXT, FOREIGN KEY (parent) REFERENCES tags(tag_id))');

        // Populate environment properties table
        const propInsert = db.prepare('INSERT INTO properties(name, value) VALUES(?, ?)');
        propInsert.run('env_id', data.envId);
        propInsert.run('env_name', data.envName);
        propInsert.run('env_root', data.envRoot);
        propInsert.run('env_colour', '#c24968');

        db.close();
    }

}

module.exports = Environment;
