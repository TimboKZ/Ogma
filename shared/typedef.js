/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

/**
 * @typedef {object} SettingsData
 * @property {string} lastPageHash
 */

/**
 * @typedef {object} EnvSummary
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} icon
 * @property {string} colour
 * @property {string} dbFile
 * @property {boolean} isHidden
 */

/**
 * @typedef {object} FileData
 * @property {string} base
 * @property {string} name
 * @property {string} ext
 * @property {string} path
 * @property {boolean} isFile
 * @property {boolean} isDirectory
 * @property {boolean} isSymlink
 */

/**
 * @enum {string} Setting
 */
const Setting = {
    lastPageHash: 'lastPageHash',
};

/**
 * @enum {string} EnvProperty
 */
const EnvProperty = {
    id: 'id',
    name: 'name',
    root: 'root',
    icon: 'icon',
    colour: 'colour',
    dbFile: 'dbFile',
    isHidden: 'isHidden',
};

const HomeRoutePath = '/home';

const Colours = [
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

const BulmaSizes = ['small', 'medium', 'large'];

module.exports = {
    Setting,
    EnvProperty,
    HomeRoutePath,
    Colours,
    BulmaSizes,
};
