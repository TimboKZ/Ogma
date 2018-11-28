/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const Promise = require('bluebird');
const promiseIpc = require('electron-promise-ipc');

const DataContext = React.createContext(null);

class DataManager {

    constructor() {
        this.summariesFetched = false;
        this.envIds = [];
        this.envSummaries = [];
        this.envSummaryMap = {};
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
                for (const summary of envSummaries) {
                    envIds.push(summary.id);
                    envSummaryMap[summary.id] = summary;
                }
                this.envIds = envIds;
                this.envSummaries = envSummaries;
                this.envSummaryMap = envSummaryMap;
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

}

module.exports = {DataContext, DataManager};
