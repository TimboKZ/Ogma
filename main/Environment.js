/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const sqlite3 = require('sqlite3');

class Environment {

    /**
     * @param {object} data
     * @param {string} data.dbPath
     */
    constructor(data) {
        this.dbPath = data.dbPath;
        console.log(this.dbPath);
    }

    /**
     * @param {object} data
     * @param {string} data.envName
     * @param {string} data.envId
     * @param {string} data.envRoot
     * @param {string} data.dbPath
     */
    static create(data) {
        const db = new sqlite3.Database(data.dbPath, sqlite3.OPEN_CREATE);
    }

}

module.exports = Environment;
