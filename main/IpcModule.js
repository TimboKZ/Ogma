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
            const envRoot = dialog.showOpenDialog({
                title: 'Choose the root directory for the new environment',
                properties: ['openDirectory'],
            })[0];
            this.ogmaCore.createEnvironment({envRoot});
        });
    }

}

module.exports = IpcModule;
