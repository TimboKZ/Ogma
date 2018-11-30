/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');

const Util = require('../../shared/Util');
const Environment = require('./Environment');
const {EnvProperty} = require('../../shared/typedef');

class EnvironmentManager {

    /**
     * @param {object} data
     * @param {string} data.envsDir
     */
    constructor(data) {
        this.envsDir = data.envsDir;

        this.envMap = {};
        this.hiddenEnvSummaryMap = {};
    }

    init() {
        const dbFiles = fs.readdirSync(this.envsDir);
        console.log(`Found ${dbFiles.length} environments on startup.`);
        for (const dbFileName of dbFiles) {
            if (!dbFileName.startsWith('env')) continue;
            const dbFile = path.join(this.envsDir, dbFileName);
            const env = new Environment({dbFile});

            const summary = env.getSummary();
            if (env.isHidden()) {
                this.hiddenEnvSummaryMap[summary.id] = summary;
                env.close();
            } else {
                this.envMap[summary.id] = env;
            }
        }
    }

    getEnvMap() {
        return this.envMap;
    }

    /**
     * @param {object} data
     * @param {string} data.envRoot
     */
    createEnvironment(data) {
        const basename = path.basename(data.envRoot).trim();

        let envId;
        let dbFile;
        do {
            envId = Util.generateBaseName({fileName: basename, groupName: 'env'});
            dbFile = path.join(this.envsDir, `${envId}.sqlite3`);
        } while (fs.pathExistsSync(dbFile));

        this.envMap[envId] = Environment.create({
            envName: basename,
            envId,
            envRoot: data.envRoot,
            envColour: '#c24968',
            dbFile,
        });
        return envId;
    }

    /**
     * @param {object} data
     * @param {string} data.id
     */
    hideEnvironment(data) {
        const env = this.envMap[data.id];
        delete this.envMap[data.id];
        env.set(EnvProperty.isHidden, 'true');
        this.hiddenEnvSummaryMap[data.id] = env.getSummary();
        env.close();
    }

}

module.exports = EnvironmentManager;
