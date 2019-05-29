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
 * @typedef {object} ConnectionDetails
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
    UpdateEnvSummary: 'update-env-summary',
};

/**
 * @typedef {object} EnvSummary
 * @property {string} id
 * @property {string} path
 * @property {string} slug
 * @property {string} name
 * @property {string} icon
 * @property {string} color
 */

/** @enum {string} EnvProperty */
const EnvProperty = {
    id: 'id',
    path: 'path',

    slug: 'slug',
    name: 'name',
    icon: 'icon',
    color: 'color',
};
const MutableEnvProperties = [
    EnvProperty.slug,
    EnvProperty.name,
    EnvProperty.icon,
    EnvProperty.color,
];

/** @enum {string} Colors */
const Colors = [
    '#b71c1c',
    '#d32f2f',
    '#f44336',
    '#880e4f',
    '#c2185b',
    '#e91e63',
    '#4a148c',
    '#7b1fa2',
    '#9c27b0',
    '#311b92',
    '#512da8',
    '#673ab7',
    '#1a237e',
    '#303f9f',
    '#3f51b5',
    '#0d47a1',
    '#1976d2',
    '#2196f3',
    '#006064',
    '#0097a7',
    '#004d40',
    '#00796b',
    '#009688',
    '#194d33',
    '#388e3c',
    '#4caf50',
    '#e65100',
    '#f57c00',
    '#bf360c',
    '#e64a19',
    '#ff5722',
    '#3e2723',
    '#5d4037',
    '#795548',
    '#263238',
    '#455a64',
    '#607d8b',
    '#000000',
    '#525252',
    '#969696',
];

const eventsToForward = [BackendEvents.UpdateEnvSummaries, BackendEvents.UpdateEnvSummary];
const ForwardedEventsMap = {};
for (const eventName of eventsToForward) ForwardedEventsMap[eventName] = true;

module.exports = {
    BackendEvents,
    ForwardedEventsMap,
    EnvProperty,
    MutableEnvProperties,
    Colors,
};
