/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const {dialog} = require('electron');
const promiseIpc = require('electron-promise-ipc');

class IpcModule {

    /**
     * @param {object} data
     * @param {MainApp} data.mainApp
     * @param {OgmaCore} data.ogmaCore
     */
    constructor(data) {
        this.mainApp = data.mainApp;
        this.ogmaCore = data.ogmaCore;
    }

    init() {
        promiseIpc.on('getInitWarnings', () => this.ogmaCore.getInitWarnings());
        promiseIpc.on('createEnv', () => {
            const dialogResponse = dialog.showOpenDialog({
                title: 'Choose the root directory for the new environment',
                properties: ['openDirectory'],
            });

            // Check if user cancelled the operation
            if (!dialogResponse) return;
            const envRoot = dialogResponse[0];

            const newEnvId = this.ogmaCore.createEnvironment({envRoot});
            return newEnvId;
        });
        promiseIpc.on('getEnvSummaries', () => {
            const envMap = this.ogmaCore.getEnvMap();
            const envIds = Object.keys(envMap);
            const envSummaries = new Array(envIds.length);

            for (let i = 0; i < envIds.length; i++) {
                const envId = envIds[i];
                const env = envMap[envId];
                envSummaries[i] = env.getSummary();
            }

            return envSummaries;
        });
    }

}

module.exports = IpcModule;
