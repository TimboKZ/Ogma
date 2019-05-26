/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const fs = require('fs-extra');
const {dialog} = require('electron');

const Environment = require('./Environment');

class EnvironmentManager {

    /**
     * @param {object} data
     * @param {Config} data.config
     */
    constructor(data) {
        this.config = data.config;
        this.openEnvs = [];

        for (const envPath of this.config.getOpenEnvironments()) {
            this.openEnvironment({envPath, preventOpenEnvUpdate: true});
        }
        this.updateOpenEnvironments();
    }

    /**
     * @param {object} data
     * @param {object} [data.path] Absolute path to the new environment. If it's not provided, will prompt user to
     *                             choose path.
     */
    createEnvironment(data = {}) {

        let envPath = data.path;
        if (!envPath) {
            envPath = dialog.showOpenDialog({
                title: 'Choose a root folder for the collection',
                properties: {openFile: false, openDirectory: true, multiSelections: false, showHiddenFiles: true},
            });
        }

        console.log(envPath);
        return envPath;
    }

    /**
     * @param {object} data
     * @param {string} data.envPath Absolute path to an environment
     * @param {boolean} [data.preventOpenEnvUpdate] Whether to update open environments in the config
     */
    openEnvironment(data) {
        if (fs.pathExistsSync(data.envPath)) {
            throw new Error(`Requested environment does not exist! Path: ${data.envPath}`);
        }

        const env = new Environment({envPath: data.envPath});
        this.openEnvs.push(env);

        if (!data.preventOpenEnvUpdate) this.updateOpenEnvironments();
    }

    updateOpenEnvironments() {
        const openEnvPaths = new Array(this.openEnvs.length);
        for (let i = 0; i < this.openEnvs.length; ++i) {
            const env = this.openEnvs[i];
            openEnvPaths[i] = env.getPath();
        }

        this.config.setOpenEnvironments(openEnvPaths);
    }

}

module.exports = EnvironmentManager;
