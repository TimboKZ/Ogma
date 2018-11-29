/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const Util = require ('../../../main/Util');

class FileManager {

    /**
     * @param {object} data
     * @param {EnvSummary} data.envSummary
     */
    constructor(data) {
        this.envSummary = data.envSummary;

        this.directoryCache = {};
    }

    /**
     * @param {object} data
     * @param {string} data.dir
     * @param {bool} [data.force]
     */
    fetchFiles(data) {
        if (!data.force && this.directoryCache[data.dir]) return this.directoryCache[data.dir];

        // TODO: Decide whether this check is actually needed.
        // if (!data.dir.startsWith(this.envSummary.root))
        //     throw new Error('Requested path is outside of environment root!');

        const fileNames = fs.readdirSync(data.dir);
        const files = new Array(fileNames.length);

        for (let i = 0; i < fileNames.length; i++) {
            const name = fileNames[i];
            const filePath = path.join(data.dir, name);
            files[i] = Util.getFileData({filePath});
        }

        this.directoryCache[data.dir] = files;
        return files;
    }

    invalidateCache() {
        this.directoryCache = {};
    }

}

module.exports = FileManager;
