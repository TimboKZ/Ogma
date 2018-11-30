/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const Promise = require('bluebird');

class Util {

    static isDevMode() {
        return process.env['NODE_ENV'] === 'development';
    }

    static md5(string) {
        return crypto.createHash('md5').update(string).digest('hex');
    }

    static getStaticPath() {
        return path.normalize(path.join(__dirname, '..', 'static'));
    }

    static slugify(string) {
        return string.replace(/\W/g, '').toLowerCase();
    }

    /**
     * @param {object} data
     * @param {string} data.groupName
     * @param {string} data.fileName
     */
    static generateBaseName(data) {
        const slug = Util.slugify(path.basename(data.fileName));
        const timeStr = new Date().getTime();
        const hash = Util.md5(`${Math.random()}${timeStr}${slug}`);

        let basename = `${data.groupName}_`;
        if (slug.length !== 0) basename += `${slug.substr(0, 6)}_`;
        basename += hash.substr(hash.length - 13, 8);
        return basename;
    }

    /**
     * @param {object} data
     * @param {string} data.filePath
     * @returns {FileData}
     */
    static getFileData(data) {
        const stats = fs.lstatSync(data.filePath);
        const info = path.parse(data.filePath);
        return {
            base: info.base,
            name: info.name,
            ext: info.ext.toLowerCase().replace(/^\./, ''),
            path: data.filePath,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
        };
    }

    /**
     * @param {object} data
     * @param {string} data.filePath
     * @param {boolean} [data.allowDirectory]
     * @returns {Promise<number>} Returns promise resolving into file size in bytes
     */
    static getFileSize(data) {
        return fs.stat(data.filePath)
            .then(stats => {
                if (stats.isDirectory()) {
                    if (!data.allowDirectory)
                        throw new Error('Requested file size of a directory - set' +
                            ' \'allowDirectory\' to true to enable this behaviour.');

                    // Get directory size recursively
                    return fs.readdir(data.filePath)
                        .then(files => {
                            const promises = files.map(fileName => Util.getFileSize({
                                filePath: path.join(data.filePath, fileName),
                                allowDirectory: true,
                            }));
                            return Promise.all(promises);
                        })
                        .then(sizes => sizes.reduce((acc, x) => acc + x));
                }

                return stats.size;
            });
    }


    /**
     * @param {object} data
     * @param {string} data.filePath
     * @param {boolean} [data.allowDirectory]
     * @returns {Promise<string>}
     */
    static getFriendlyFileSize(data) {
        return Util.getFileSize(data)
            .then(sizeInBytes => {
                let size;
                let units;
                if (sizeInBytes < 1000) {
                    size = sizeInBytes;
                    units = 'bytes';
                } else if (sizeInBytes < 1000000) {
                    size = sizeInBytes / 1000;
                    units = 'kb';
                } else {
                    size = sizeInBytes / 1000000;
                    units = 'mb';
                }

                return `${size.toFixed(1)} ${units}`;
            });
    }

}

module.exports = Util;
