/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const Promise = require('bluebird');
const {dialog} = require('electron');
const promiseIpc = require('electron-promise-ipc');

const Util = require('../shared/Util');

function readonly(target, key, descriptor) {
    descriptor.writable = false;
    return descriptor;
}

class IpcModule {

    /**
     * @param {object} data
     * @param {string} data.mode
     * @param {OgmaCore} [data.ogmaCore]
     */
    constructor(data) {
        if (data.mode !== 'server' && data.mode !== 'client') {
            throw new Error('\'mode\' in IpcModule constructor should be set to either client or server.');
        }
        this.mode = data.mode;
        this.otherMode = data.mode === 'server' ? 'client' : 'server';

        if (this.mode === 'server') {
            this.ogmaCore = data.ogmaCore;
            this.settingsManager = this.ogmaCore.settingsManager;
            this.thumbManager = this.ogmaCore.thumbManager;
        }
    }

    init() {
        const takenNames = {};
        const methodNames = Object.getOwnPropertyNames(IpcModule.prototype);
        for (const methodName of methodNames) {
            let methodMode;

            // Determine whether we even need to prepare this method
            if (methodName.startsWith(`${this.mode}_`)) methodMode = this.mode;
            else if (methodName.startsWith(`${this.otherMode}`)) methodMode = this.otherMode;
            else continue;

            // Check if we're not redefining a method multiple times
            const alias = methodName.replace(`${methodMode}_`, '');
            if (takenNames[alias])
                throw new Error(`Tried to redefine method ${alias} in IpcModule!`);
            takenNames[alias] = true;

            // Define method as passive or active depending on the mode
            const data = {methodName, alias};
            if (methodMode === this.mode) this._prepareActiveMethod(data);
            else this._preparePassiveMethod(data);
        }
    }

    /**
     * @param {object} data
     * @param {string} data.methodName
     * @param {string} data.alias
     */
    _prepareActiveMethod(data) {
        this[data.alias] = this[data.methodName];
        promiseIpc.on(data.alias, this[data.methodName].bind(this));
    }

    /**
     * @param {object} data
     * @param {string} data.alias
     */
    _preparePassiveMethod(data) {
        if (Util.isDevMode()) {
            // In development mode, add an extra check to the function that makes sure we only ever pass a single
            // object as the method parameter.
            this[data.alias] = function () {
                if (arguments.length !== 0 && typeof arguments[0] !== 'object') {
                    return Promise.reject(
                        new Error(`Argument passed to IpcModule function '${data.alias}' is not an object!`),
                    );
                }
                return promiseIpc.send(data.alias, ...arguments);
            };
        } else {
            // In production mode, just use a normal function.
            this[data.alias] = function () {
                return promiseIpc.send(data.alias, ...arguments);
            };
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.getInitWarnings
     * @returns {Promise<string[]>}
     */
    server_getInitWarnings() {
        return this.ogmaCore.getInitWarnings();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.getSettings
     * @returns {Promise<SettingsData>}
     */
    server_getSettings() {
        return this.settingsManager.getSettings();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.setSetting
     * @param {object} data
     * @param {string} data.name
     * @param {string} data.value
     */
    server_setSetting(data) {
        return this.ogmaCore.settingsManager.set(data.name, data.value);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.createEnv
     */
    server_createEnv() {
        const dialogResponse = dialog.showOpenDialog({
            title: 'Choose the root directory for the new environment',
            properties: ['openDirectory'],
        });

        // Check if user cancelled the operation
        if (!dialogResponse) return null;
        const envRoot = dialogResponse[0];

        return this.ogmaCore.envManager.createEnvironment({envRoot});
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.hideEnv
     * @param {object} data
     * @param {string} data.id
     */
    server_hideEnv(data) {
        return this.ogmaCore.envManager.hideEnvironment(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.getEnvSummaries
     */
    server_getEnvSummaries() {
        const envMap = this.ogmaCore.envManager.getEnvMap();
        const envIds = Object.keys(envMap);
        const envSummaries = new Array(envIds.length);

        for (let i = 0; i < envIds.length; i++) {
            const envId = envIds[i];
            const env = envMap[envId];
            envSummaries[i] = env.getSummary();
        }

        return envSummaries;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @alias IpcModule.getThumbnail
     * @param {object} data
     * @param {string} data.filePath
     */
    server_getThumbnail(data) {
        return this.thumbManager.getThumbnail({filePath: data.filePath});
    }

}

module.exports = IpcModule;
