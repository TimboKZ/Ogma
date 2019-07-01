/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const _ = require('lodash');
const fs = require('fs-extra');

const Util = require('./Util');
const {BackendEvents} = require('../../shared/typedef');

class Config {

    /**
     * @param {object} data
     * @param {string} data.configPath Absolute path to the config
     */
    constructor(data) {
        this.configPath = data.configPath;
        this.configData = {};
    }

    init() {
        const configFileExists = this.ensureConfigFile();
        this.loadConfig({loadFromFile: configFileExists});
    }

    /**
     * @returns {boolean} True if config file already exists
     */
    ensureConfigFile() {
        if (fs.pathExistsSync(this.configPath)) return true;

        fs.writeFileSync(this.configPath, '{}');
        return false;
    }

    /**
     *
     * @param {object} data
     * @param {boolean} [data.loadFromFile]
     */
    loadConfig(data) {
        let configData = Config.getDefaultConfig();

        if (data.loadFromFile) {
            const dataFromFile = JSON.parse(fs.readFileSync(this.configPath).toString());
            configData = {...configData, ...dataFromFile};
        } else {
            fs.writeFileSync(this.configPath, JSON.stringify(configData));
        }

        /** @type {ConfigData} */
        this.configData = configData;
    }

    saveConfig() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData));
    }

    /**
     * @returns {ConfigData}
     */
    static getDefaultConfig() {
        return {
            ogmaBackendVersion: Util.getPackageVersion(),
            openEnvironments: [],
        };
    }

    /**
     * @returns {AbsPath[]}
     */
    getOpenEnvironments() {
        return this.configData.openEnvironments;
    }

    /**
     * @param {AbsPath[]} paths
     */
    setOpenEnvironments(paths) {
        this.configData.openEnvironments = paths;
        this.saveConfig();
    }
}

module.exports = Config;
