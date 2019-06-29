/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');

class FileManager {

    /**
     * @param {object} data
     * @param {string} data.root
     */
    constructor(data) {
        this.root = data.root;
    }

    /**
     * @param {RelPath} relPath
     * @returns {AbsPath}
     * @private
     */
    _expand(relPath) {
        return path.join(this.root, relPath);
    }

    /**
     * @param {object} data
     * @param {EnvPath} data.oldPath
     * @param {EnvPath} data.newPath
     * @param {boolean} [data.overwrite=false]
     */
    renameFile(data) {
        const oldPath = this._expand(data.oldPath);
        const newPath = this._expand(data.newPath);
        const overwrite = !!data.overwrite;
        return Promise.resolve()
            .then(() => {
                if (!fs.existsSync(oldPath)) throw new Error(`The original path does not exist: ${oldPath}`);
                if (!overwrite && fs.existsSync(newPath)) throw new Error(`Path is already taken! Path: ${newPath}`);

                return fs.rename(oldPath, newPath);
            });
    }

}

module.exports = FileManager;
