/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const Database = require('better-sqlite3');

const Util = require('./Util');
const {EnvProperty} = require('../typedef');

const logger = Util.getLogger();

class Environment {

    /**
     * @param {object} data
     * @param {AbsPath} data.path Absolute path to the environment, can be OS specific
     * @param {EnvironmentManager} data.envManager
     * @param {boolean} [data.allowCreate]
     */
    constructor(data) {
        this.path = data.path;
        this.envManager = data.envManager;
        this.allowCreate = !!data.allowCreate;

        this.dirName = path.basename(this.path);
        this.confDirPath = path.join(this.path, '.ogma-env');
        this.dbPath = path.join(this.confDirPath, 'data.sqlite');
    }

    init() {
        if (!fs.pathExistsSync(this.path)) {
            throw new Error(`Specified directory does not exist! Path: ${data.path}`);
        }

        const confDirExists = fs.pathExistsSync(this.confDirPath);
        const dbExists = fs.pathExistsSync(this.dbPath);
        if ((!confDirExists || !dbExists) && !this.allowCreate) {
            throw new Error(`Specified directory is not a valid Ogma environment! Path: ${this.path}`);
        }
        if (!confDirExists) fs.ensureDirSync(this.confDirPath);

        this.prepareDb();
    }

    prepareDb() {
        this.db = new Database(this.dbPath);

        // Create tables for all necessary data
        this.db.exec('CREATE TABLE IF NOT EXISTS properties (name TEXT PRIMARY KEY, value TEXT)');
        this.db.exec('CREATE TABLE IF NOT EXISTS entities (entity_id TEXT PRIMARY KEY, file_path TEXT UNIQUE)');
        this.db.exec(`CREATE TABLE IF NOT EXISTS tags
                 (
                   tag_id     TEXT PRIMARY KEY,
                   name       TEXT,
                   colour     TEXT
                 )`);

        // Setup get and set commands
        const set = this.db.prepare('REPLACE INTO properties VALUES (?, ?)');
        const get = this.db.prepare('SELECT value FROM properties WHERE name = ?');
        get.pluck(true);
        /** @type {function(string, string)} */
        this.set = (name, value) => set.run(name, value);
        /** @type {function(string): string} */
        this.get = name => get.get(name);

        // Load environment properties
        const getEnvProperty = (property, defaultValueFunc) => {
            let value = this.get(property);
            if (value === undefined || value === '') {
                const defaultValue = defaultValueFunc();
                this.set(property, defaultValue);
                value = defaultValue;
            }
            return value;
        };
        this.id = getEnvProperty(EnvProperty.id, () => this.envManager.getNewId());
        this.slug = getEnvProperty(EnvProperty.slug, () => this.envManager.getNewSlug(this.dirName));
        this.name = getEnvProperty(EnvProperty.name, () => this.dirName);
        this.icon = getEnvProperty(EnvProperty.icon, () => 'folder-open');
        this.colour = getEnvProperty(EnvProperty.colour, () => '#4d2060');
    }

    getPath() {
        return this.path;
    }

    getSummary() {
        return {
            id: this.id,
            slug: this.slug,
            path: this.path,
            name: this.name,
            icon: this.icon,
            colour: this.colour,
        };
    }

}

module.exports = Environment;
