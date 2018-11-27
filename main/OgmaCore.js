/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const {app} = require('electron');
const shorthash = require('shorthash');

const Environment = require('./Environment');

class OgmaCore {

    /**
     * @param {object} data
     * @param {string} data.ogmaDir
     */
    constructor(data) {
        this.ogmaDir = data.ogmaDir;
        this.envDir = path.join(data.ogmaDir, 'envs');
        this.initWarnings = [];
        this.envMap = {};
    }

    init() {
        this.initDirectory();
        this.initEnvs();
    }

    initDirectory() {
        const versionFile = path.join(this.ogmaDir, 'ogma.version');

        if (!fs.pathExistsSync(this.ogmaDir)) {
            fs.ensureDirSync(this.ogmaDir);
            fs.writeFileSync(versionFile, app.getVersion());
        } else {
            if (fs.pathExistsSync(versionFile)) {
                const dirVersion = fs.readFileSync(versionFile).toString();
                if (app.getVersion() !== dirVersion) {
                    this.addWarning(`Your local \`~/.ogma/\` folder was generated using a different application\
                    version. Current version: \`${app.getVersion()}\`; Folder version: \`${dirVersion}\`.`);
                }
            } else {
                // If the folder does not contain a version file, `.ogma/` either belongs to a different
                // application or is corrupted.
                throw new Error('`.ogma` folder already exists in home ' +
                    'directory and appears to be corrupted!');
            }
        }

        if (!fs.pathExistsSync(this.envDir)) fs.ensureDirSync(this.envDir);
    }

    initEnvs() {
        const envs = fs.readdirSync(this.envDir);
        for (const env in envs) {
            console.log(env);
        }
    }

    /**
     * @param {object} data
     * @param {string} data.envRoot
     */
    createEnvironment(data) {
        const basename = path.basename(data.envRoot).trim();
        const slug = basename.replace(/\W/g, '').toLowerCase();
        const hash = shorthash.unique(`${new Date().getTime()}${data.envRoot}`);

        let envId;
        let dbPath;
        do {
            envId = 'env-';
            if (slug.length !== 0) envId += `${slug.substr(0, 6)}-`;
            envId += hash.substr(0, 6);
            dbPath = path.join(this.envDir, `${envId}.sqlite3`);
        } while (fs.pathExistsSync(dbPath));

        Environment.create({
            envName: basename,
            envId,
            envRoot: data.envRoot,
            dbPath,
        });
    }

    /**
     * @param {string} warning
     */
    addWarning(warning) {
        this.initWarnings.push(warning);
    }

    getInitWarnings() {
        return this.initWarnings;
    }

}

module.exports = OgmaCore;
