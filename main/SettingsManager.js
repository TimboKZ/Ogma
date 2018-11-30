/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const Database = require('better-sqlite3');

const {Setting} = require('../shared/typedef');

class SettingsManager {

    /**
     * @param {object} data
     * @param {string} data.settingsDbFile
     */
    constructor(data) {
        this.settingsDbFile = data.settingsDbFile;
    }

    init() {
        this.db = new Database(this.settingsDbFile);
        this.db.exec('CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT)');

        const set = this.db.prepare('REPLACE INTO settings VALUES (?, ?)');
        const get = this.db.prepare('SELECT value FROM settings WHERE name = ?');
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

    /**
     * @returns {SettingsData}
     */
    getSettings() {
        const settings = {};

        const settingNames = Object.keys(Setting);
        for (const name of settingNames) {
            settings[name] = this.get(name);
        }

        return settings;
    }

}

module.exports = SettingsManager;
module.exports.Setting = Setting;
