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
 * @property {string} code
 * @property {string} root
 * @property {string} icon
 * @property {string} colour
 * @property {string} dbFilePath
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

const BulmaSizes = ['small', 'medium', 'large'];

module.exports = {
    Setting,
    BulmaSizes,
};
