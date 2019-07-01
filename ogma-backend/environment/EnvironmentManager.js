/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const Promise = require('bluebird');
const {dialog} = require('electron');

const Util = require('../helpers/Util');
const Environment = require('./Environment');
const {BackendEvents} = require('../../shared/typedef');

const logger = Util.getLogger();

class EnvironmentManager {

    /**
     * @param {object} data
     * @param {OgmaCore} data.ogmaCore
     */
    constructor(data) {
        this.ogmaCore = data.ogmaCore;
        this.emitter = this.ogmaCore.emitter;
        this.config = this.ogmaCore.config;

        this.openEnvs = [];
        this.idMap = {};
        this.slugMap = {};
        this.pathMap = {};
    }

    init() {
        const openEnvs = this.config.getOpenEnvironments();
        const openPromises = new Array(openEnvs.length);
        for (let i = 0; i < openEnvs.length; ++i) {
            const envPath = openEnvs[i];
            openPromises[i] = this._openEnvironment({
                path: envPath,
                allowCreate: false,
            })
                .catch(error => logger.error(
                    'Error occurred while opening environment - this environment will be skipped',
                    `Path: ${envPath}\n`, error,
                ));
        }

        return Promise.all(openPromises)
    }

    /**
     * @param {object} data
     * @param {string} [data.path] Absolute path to the new environment. If it's not provided, will prompt user to
     *                             choose path.
     * @returns {Promise.<EnvSummary>}
     */
    createEnvironment(data = {}) {
        let envPath = data.path;
        if (!envPath) {
            const choices = dialog.showOpenDialog({
                title: 'Choose a root folder for the collection',
                properties: ['openDirectory', 'showHiddenFiles', 'createDirectory', 'noResolveAliases'],
            });
            if (!choices || choices.length === 0) return Promise.resolve(null);
            envPath = choices[0];
        }

        return this._openEnvironment({path: envPath, allowCreate: true})
            .then(env => {
                const summary = env.getSummary();
                this.emitter.emit(BackendEvents.CreateEnvironment, summary);
                return summary;
            });
    }

    /**
     * @param {object} data
     * @param {string} data.path Absolute path to an environment
     * @param {boolean} [data.allowCreate]
     * @returns {Promise.<Environment>}
     * @private
     */
    _openEnvironment(data) {
        if (this.pathMap[data.path]) throw new Error(`Environment is already open! Path: ${data.path}`);

        let env;
        return Promise.resolve()
            .then(() => {
                env = new Environment({
                    ogmaCore: this.ogmaCore,
                    path: data.path,
                    envManager: this,
                    allowCreate: data.allowCreate,
                });
                return env.init();
            })
            .then(() => {
                const s = env.getSummary();
                if (this.idMap[s.id]) throw new Error(`Opened environment has duplicate ID: ${s.id}`);
                if (this.slugMap[s.slug]) throw new Error(`Opened environment has duplicate slug: ${s.slug}`);
                this.idMap[s.id] = env;
                this.slugMap[s.slug] = env;
                this.pathMap[s.path] = env;

                this.openEnvs.push(env);
                return env;
            });
    }

    /**
     * @param {object} data
     * @param {string} [data.id]
     * @param {string} [data.slug]
     * @param {boolean} [data.suppressError]
     * @returns {Environment}
     */
    getEnvironment(data) {
        let env;
        if (data.id) {
            env = this.idMap[data.id];
            if (!env && !data.suppressError) throw new Error(`Environment with ID "${data.id}" does not exist!`);
        } else if (data.slug) {
            env = this.slugMap[data.slug];
            if (!env && !data.suppressError) throw new Error(`Environment with slug "${data.slug}" does not exist!`);
        } else {
            throw new Error(`getEnvironment() was called with specifiny and ID or a slug!`);
        }
        return env;
    }

    /**
     * @param {object} data
     * @param {string} data.id
     */
    closeEnvironment(data) {
        const env = this.idMap[data.id];
        if (!env) throw new Error(`Environment with the specified ID does not exist: "${data.id}".`);

        const s = env.getSummary();
        delete this.idMap[s.id];
        delete this.slugMap[s.slug];
        delete this.pathMap[s.path];

        env.close();
        this.emitter.emit(BackendEvents.CloseEnvironment, data.id);
    }

    /** @returns {EnvSummary[]} */
    getSummaries() {
        const envs = Object.values(this.idMap);
        const summaries = new Array(envs.length);
        for (let i = 0; i < envs.length; ++i) {
            summaries[i] = envs[i].getSummary();
        }
        return summaries;
    }

    getNewId() {
        let id = Util.getShortId();
        while (this.idMap[id]) {
            id = Util.getShortId();
        }
        return id;
    }

    /** @param {string} baseName */
    getNewSlug(baseName) {
        let base_slug = baseName.trim().toLowerCase();
        base_slug = base_slug.replace(/[^a-z0-9\-]/g, '-');
        base_slug = base_slug.replace(/-+/g, '-');

        let slug = base_slug;
        let count = 1;
        while (this.slugMap[slug]) {
            slug = `${base_slug}-${count}`;
            ++count;
        }

        return slug;
    }

}

module.exports = EnvironmentManager;
