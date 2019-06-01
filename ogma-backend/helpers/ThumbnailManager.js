/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const upath = require('upath');
const Promise = require('bluebird');
const Database = require('better-sqlite3');
const ThumbnailGenerator = require('fs-thumbnail');

const Util = require('./Util');

const logger = Util.getLogger();

class ThumbManager {

    /**
     * @param {object} data
     * @param {string} data.thumbsDir
     * @param {string} data.thumbsDbPath
     * @param {string} data.basePath
     */
    constructor(data) {
        this.thumbsDir = data.thumbsDir;
        this.thumbsDbPath = data.thumbsDbPath;
        this.basePath = data.basePath;

        this.generator = new ThumbnailGenerator({verbose: false, size: 300, quality: 30});
    }

    init() {
        // Prepare file system structure
        fs.ensureDirSync(this.thumbsDir);
        this.db = new Database(this.thumbsDbPath);
        const db = this.db;
        db.exec(`CREATE TABLE IF NOT EXISTS
                     thumbnails
                 (
                     hash    TEXT PRIMARY KEY UNIQUE,
                     nixPath TEXT,
                     epoch   INTEGER
                 )`);
        db.exec(`CREATE INDEX IF NOT EXISTS thumb_nix_path ON thumbnails (nixPath)`);
        this.insertThumb = Util.prepSqlRun(db, 'REPLACE INTO thumbnails VALUES(?, ?, ?)');
        this.selectThumbByHash = Util.prepSqlGet(db, 'SELECT * FROM thumbnails WHERE hash = ?');
        this.deleteThumbByHash = Util.prepSqlRun(db, 'DELETE FROM thumbnails WHERE hash = ?');
    }

    /**
     * @param {object} data
     * @param {string} data.path Path relative to environment root, can be OS specific.
     * @returns {Promise.<string|null>}
     */
    getOrCreateThumbnail(data) {
        const osPath = path.join(this.basePath, data.path);
        const nixPath = upath.toUnix(data.path);
        const hash = Util.getMd5(nixPath);

        const thumbName = `${hash}.jpg`;
        const thumbPath = path.join(this.thumbsDir, thumbName);

        return fs.stat(osPath)
            .then(stats => {
                const thumbData = this.selectThumbByHash(hash);

                // Check if thumbnail was previously generated
                if (!thumbData) return false;

                // Check if thumbnail exists only in the database
                if (!fs.pathExistsSync(thumbPath)) {
                    this.deleteThumbByHash(hash);
                    return false;
                }

                // Check if thumbnail is outdated
                const fileEpoch = stats.mtimeMs / 1000;
                if (fileEpoch > thumbData.epoch) {
                    return false;
                }

                // Return thumb name if everything is ok
                return true;
            })
            .then(thumbExists => {
                if (thumbExists) return thumbName;

                return this.generator.getThumbnail({path: osPath, output: thumbPath})
                    .then(generatedThumbPath => {
                        // Some error occurred during generation
                        if (!generatedThumbPath) return null;

                        // Store thumb data into the database
                        const epoch = Math.round(new Date().getTime() / 1000);
                        this.insertThumb(hash, nixPath, epoch);

                        return thumbName;
                    });
            });
    }

}

module.exports = ThumbManager;
