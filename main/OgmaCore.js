/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const {app} = require('electron');

const SettingsManager = require('./helpers/SettingsManager');
const ThumbManager = require('./helpers/ThumbManager');
const EnvironmentManager = require('./helpers/EnvironmentManager');

class OgmaCore {

    /**
     * @param {object} data
     * @param {string} data.ogmaDir
     */
    constructor(data) {
        this.ogmaDir = data.ogmaDir;

        this.settingsDbFile = path.join(data.ogmaDir, 'settings.sqlite3');
        this.settingsManager = new SettingsManager({settingsDbFile: this.settingsDbFile});

        this.thumbsDir = path.join(data.ogmaDir, 'thumbs');
        this.thumbsDbFile = path.join(data.ogmaDir, 'thumbs.sqlite3');
        this.thumbManager = new ThumbManager({thumbsDir: this.thumbsDir, thumbsDbFile: this.thumbsDbFile});

        this.envsDir = path.join(data.ogmaDir, 'envs');
        this.envManager = new EnvironmentManager({envsDir: this.envsDir});

        this.initWarnings = [];
    }

    init() {
        this.initDirectory();
        this.settingsManager.init();
        this.thumbManager.init();
        this.envManager.init();
    }

    initDirectory() {
        const versionFile = path.join(this.ogmaDir, 'ogma.version');

        if (!fs.pathExistsSync(this.ogmaDir) || fs.readdirSync(this.ogmaDir).length === 0) {
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
                // If the folder i does not contain a version file, `.ogma/` either belongs to a different
                // application or is corrupted.
                throw new Error('`.ogma` folder already exists in home ' +
                    'directory and appears to be corrupted!');
            }
        }

        fs.ensureDirSync(this.envsDir);
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
