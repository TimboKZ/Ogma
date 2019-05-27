/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

/**
 * @typedef ConfigData
 * @property {string} ogmaBackendVersion
 * @property {string[]} openEnvironments
 */

/**
 * @typedef {object} HelloResponse
 * @property {boolean} localClient
 */

/**
 * @typedef {EventEmitter2} EventEmitter
 */

/**
 * @typedef {string} AbsPath
 * @typedef {string} RelPath
 * @typedef {string} AnyPath
 */

/** @enum {string} BackendEvents */
const BackendEvents = {
    UpdateEnvSummaries: 'update-env-summaries',
};

/** @enum {string} EnvProperty */
const EnvProperty = {
    id: 'id',
    slug: 'slug',
    name: 'name',
    icon: 'icon',
    colour: 'colour',
};

module.exports = {BackendEvents, EnvProperty};
