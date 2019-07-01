/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const Denque = require('denque');
const Promise = require('bluebird');

const Util = require('../helpers/Util');
const {OgmaEnvFolder} = require('../../shared/typedef');

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
     * @param {EnvPath} data.path
     */
    createFolder(data) {
        const folderPath = this._expand(data.path);
        return Promise.resolve()
            .then(() => {
                if (fs.existsSync(folderPath)) throw new Error(`Path is already taken! Path: ${folderPath}`);
                return fs.mkdirp(folderPath);
            });
    }

    /**
     * @param {object} data
     * @param {RelPath} data.path Path relative to environment root
     * @param {string[]} data.cachedHashes Hashes that are assumed to be in this directory
     * @param {number} data.dirReadTime Time (in seconds) when the directory was initially read
     */
    checkFolder(data) {
        const folderRelPath = data.path;
        const folderFullPath = this._expand(folderRelPath);
        return fs.readdir(folderFullPath)
            .then(fileNames => {
                fileNames = fileNames.filter(n => n !== OgmaEnvFolder);
                const envPaths = fileNames.map(n => path.join(folderRelPath, n));
                const fullPaths = envPaths.map(p => this._expand(p));
                const statPromises = fullPaths.map(p => fs.lstat(p));

                const nixPaths = envPaths.map(p => Util.nixPath(p));
                const hashes = nixPaths.map(p => Util.fileHash(p));
                const deletedHashes = _.difference(data.cachedHashes, hashes);
                return Promise.all(statPromises)
                    .then(statsArray => {
                        // See https://www.quora.com/What-is-the-difference-between-mtime-atime-and-ctime
                        const newNixPathQueue = new Denque();
                        for (let i = 0; i < statsArray.length; ++i) {
                            const stats = statsArray[i];
                            const changeTimestamp = stats.ctimeMs / 1000;
                            const changed = changeTimestamp > data.dirReadTime;
                            if (changed) {
                                newNixPathQueue.push(nixPaths[i]);
                            }
                        }
                        return {deletedHashes, newNixPaths: newNixPathQueue.toArray()};
                    });
            });
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
