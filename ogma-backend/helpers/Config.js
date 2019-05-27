/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const _ = require('lodash');
const fs = require('fs-extra');

const Util = require('./Util');
const {BackendEvents} = require('../typedef');

class Config {

    /**
     * @param {object} data
     * @param {EventEmitter} data.emitter
     * @param {string} data.configPath Absolute path to the config
     */
    constructor(data) {
        this.emitter = data.emitter;
        this.configPath = data.configPath;
        this.configData = {};
    }

    init() {
        const configFileExists = this.ensureConfigFile();
        this.loadConfig({loadFromFile: configFileExists});
        this.setupListeners();
    }

    setupListeners() {
        this.emitter.on(BackendEvents.UpdateEnvSummaries, envSummaries => {
            this.configData.openEnvironments = _.map(envSummaries, s => s.path);
            this.saveConfig();
        });
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

    getOpenEnvironments() {
        return this.configData.openEnvironments;
    }
}

module.exports = Config;
