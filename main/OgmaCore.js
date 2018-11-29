/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const {app} = require('electron');
const Database = require('better-sqlite3');

const Util = require('./Util');
const ThumbManager = require('./ThumbManager');
const Environment = require('./Environment');

class OgmaCore {

    /**
     * @param {object} data
     * @param {string} data.ogmaDir
     */
    constructor(data) {
        this.ogmaDir = data.ogmaDir;
        this.envDir = path.join(data.ogmaDir, 'envs');
        this.thumbsDir = path.join(data.ogmaDir, 'thumbs');
        this.thumbsDbFile = path.join(data.ogmaDir, 'thumbs.sqlite3');

        this.thumbManager = new ThumbManager({thumbsDir: this.thumbsDir, thumbsDbFile: this.thumbsDbFile});

        this.initWarnings = [];
        this.envMap = {};
    }

    /**
     * @returns {ThumbManager}
     */
    getThumbManager() {
        return this.thumbManager;
    }

    getEnvMap() {
        return this.envMap;
    }

    init() {
        this.initDirectory();
        this.initThumbs();
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

        fs.ensureDirSync(this.envDir);
    }

    initThumbs() {
        fs.ensureDirSync(this.thumbsDir);
        const db = new Database(this.thumbsDbFile);
        db.exec(`CREATE TABLE IF NOT EXISTS thumbnails(path  TEXT PRIMARY KEY UNIQUE, dir TEXT, thumb TEXT, epoch INTEGER)`);
        db.exec(`CREATE INDEX IF NOT EXISTS thumb_dir ON thumbnails (dir)`);
        db.close();

        this.thumbManager.init();
    }

    /**
     * Loads of all the environments from `~/.ogma/envs/` folder.
     */
    initEnvs() {
        const envs = fs.readdirSync(this.envDir);
        console.log(`Found ${envs.length} environments on startup.`);
        for (const dbFileName of envs) {
            if (!dbFileName.startsWith('env')) continue;
            const dbPath = path.join(this.envDir, dbFileName);
            const env = new Environment({dbPath});

            this.envMap[env.getSummary().id] = env;
        }
    }

    /**
     * @param {object} data
     * @param {string} data.envRoot
     */
    createEnvironment(data) {
        const basename = path.basename(data.envRoot).trim();

        let envId;
        let dbPath;
        do {
            envId = Util.generateBaseName({fileName: basename, groupName: 'env'});
            dbPath = path.join(this.envDir, `${envId}.sqlite3`);
        } while (fs.pathExistsSync(dbPath));

        Environment.create({
            envName: basename,
            envId,
            envRoot: data.envRoot,
            dbPath,
        });

        return envId;
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
