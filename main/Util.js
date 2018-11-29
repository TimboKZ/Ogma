/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');

class Util {

    static getStaticPath() {
        return path.normalize(path.join(__dirname, '..', 'static'));
    }

    /**
     * @param {string} filePath
     * @returns {FileData}
     */
    static getFileData(filePath) {
        const stats = fs.lstatSync(filePath);
        const info = path.parse(filePath);
        return {
            base: info.base,
            name: info.name,
            ext: info.ext.toLowerCase().replace(/^\./, ''),
            path: filePath,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
        };
    }

}

module.exports = Util;
