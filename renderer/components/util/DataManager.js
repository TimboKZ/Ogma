/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const Promise = require('bluebird');
const promiseIpc = require('electron-promise-ipc');

const FileManager = require('./FileManager');

class DataManager {

    constructor() {
        this.summariesFetched = false;
        this.envIds = [];
        this.envSummaries = [];
        this.envSummaryMap = {};

        this.fileManagerMap = {};
    }

    _ensureEnvSummaries() {
        if (this.summariesFetched) return Promise.resolve();
        else return this._refreshEnvSummaries();
    }

    _refreshEnvSummaries() {
        return promiseIpc.send('getEnvSummaries')
            .then(envSummaries => {
                const envIds = [];
                const envSummaryMap = {};
                const fileManagerMap = {};
                for (const summary of envSummaries) {
                    envIds.push(summary.id);
                    envSummaryMap[summary.id] = summary;
                    fileManagerMap[summary.id] = this.fileManagerMap[summary.id];
                }
                this.envIds = envIds;
                this.envSummaries = envSummaries;
                this.envSummaryMap = envSummaryMap;
                this.fileManagerMap = fileManagerMap;
                this.summariesFetched = true;
            });
    }

    getEnvIds() {
        return this._ensureEnvSummaries()
            .then(() => this.envIds);
    }

    getEnvSummaries() {
        return this._ensureEnvSummaries()
            .then(() => this.envSummaries);
    }

    /**
     * @param {object} data
     * @param {string} data.id
     * @returns {Promise<EnvSummary>}
     */
    getEnvSummary(data) {
        return this._ensureEnvSummaries()
            .then(() => this.envSummaryMap[data.id]);
    }

    /**
     * @param {object} data
     * @param {string} data.filePath
     * @returns {Promise<string|null>}
     */
    getThumbnail(data) {
        return promiseIpc.send('getThumbnail', data.filePath);
    }

    /**
     * @param {object} data
     * @param {string} data.envId
     */
    getFileManager(data) {
        if (!this.fileManagerMap[data.envId]) {
            const envSummary = this.envSummaryMap[data.envId];
            if (!envSummary) throw new Error(`Can't create a file manager - environment \
            '${data.envId}' does not exist!`);

            this.fileManagerMap[data.envId] = new FileManager({envSummary});
        }
        return this.fileManagerMap[data.envId];
    }

}

module.exports = DataManager;
