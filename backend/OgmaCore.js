/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');

const Config = require('./helpers/Config');
const Server = require('./helpers/Server');
const EnvironmentManager = require('./helpers/EnvironmentManager');

class OgmaCore {

    /**
     * @param {object} data
     * @param {string} data.host
     * @param {number} data.port
     */
    constructor(data) {
        this.host = data.host;
        this.port = data.port;

        this.ogmaHomePath = path.join(os.homedir(), '.ogma');
        this.ogmaConfigPath = path.join(this.ogmaHomePath, 'ogmarc.json');

        this.config = null;
        this.envManager = null;
        this.server = null;
    }

    init() {
        return Promise.resolve()
            .then(() => {
                fs.ensureDirSync(this.ogmaHomePath);
                this.config = new Config({configPath: this.ogmaConfigPath});
                this.envManager = new EnvironmentManager({config: this.config});
                this.server = new Server({port: this.port, envManager: this.envManager});

                this.server.start();
            });
    }

}

module.exports = OgmaCore;
