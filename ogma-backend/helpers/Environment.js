/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const {shell} = require('electron');
const Database = require('better-sqlite3');

const Util = require('./Util');
const {OgmaEnvFolder, BackendEvents, EnvProperty, Colors} = require('../../shared/typedef');

const logger = Util.getLogger();

class Environment {

    /**
     * @param {object} data
     * @param {OgmaCore} data.ogmaCore
     * @param {AbsPath} data.path Absolute path to the environment, can be OS specific
     * @param {EnvironmentManager} data.envManager
     * @param {boolean} [data.allowCreate]
     */
    constructor(data) {
        this.ogmaCore = data.ogmaCore;
        this.emitter = this.ogmaCore.emitter;
        this.path = data.path;
        this.envManager = data.envManager;
        this.allowCreate = !!data.allowCreate;

        this.dirName = path.basename(this.path);
        this.confDirPath = path.join(this.path, OgmaEnvFolder);
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

        this._prepareDb();
    }

    _prepareDb() {
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
        this.icon = getEnvProperty(EnvProperty.icon, () => 'box-open');
        this.color = getEnvProperty(EnvProperty.color, () => _.sample(Colors));
    }

    setProperty(data) {
        delete data[EnvProperty.id];
        delete data[EnvProperty.path];

        for (const key of Object.keys(data)) {
            if (!EnvProperty[key]) return;
            const value = data[key];
            this.set(key, value);
            this[key] = value;
        }

        this.emitter.emit(BackendEvents.UpdateEnvSummary, this.getSummary());
    }

    close() {
        this.db.close();
    }

    /**
     * @returns {EnvSummary}
     */
    getSummary() {
        return {
            id: this.id,
            slug: this.slug,
            path: this.path,
            name: this.name,
            icon: this.icon,
            color: this.color,
        };
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    getDirectoryContents(data) {
        const fullPath = path.join(this.path, data.path);
        const normPath = path.normalize(fullPath);
        if (normPath !== fullPath) throw new Error(`Directory path "${data.path}" is invalid!`);

        return fs.readdir(normPath)
            .then(fileNames => {
                if (data.path === '/') _.remove(fileNames, f => f === OgmaEnvFolder);

                const filePromises = new Array(fileNames.length);
                for (let i = 0; i < fileNames.length; ++i) {
                    const name = fileNames[i];
                    const filePath = path.join(normPath, name);
                    filePromises[i] = Promise.resolve()
                        .then(() => fs.lstat(filePath))
                        .then(stats => {
                            const data = path.parse(name);
                            const isDirectory = stats.isDirectory();

                            return {
                                id: Util.getId(),
                                name: isDirectory ? data.base : data.name,
                                base: data.base,
                                ext: isDirectory ? '' : data.ext,
                                isDirectory,
                            };
                        });
                }

                return Promise.all(filePromises);
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root
     */
    openFile(data) {
        const fullPath = path.join(this.path, data.path);
        const normPath = path.normalize(fullPath);
        if (normPath !== fullPath) throw new Error(`File path "${data.path}" is invalid!`);
        shell.openItem(normPath);
    }

}

module.exports = Environment;
