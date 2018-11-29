/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

class Util {

    static md5(string) {
        return crypto.createHash('md5').update(string).digest('hex');
    }

    static getStaticPath() {
        return path.normalize(path.join(__dirname, '..', 'static'));
    }

    /**
     * @param {object} data
     * @param {string} data.groupName
     * @param {string} data.fileName
     */
    static generateBaseName(data) {
        const slug = path.basename(data.fileName).replace(/\W/g, '').toLowerCase();
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

}

module.exports = Util;
