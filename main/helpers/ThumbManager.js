/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const ffmpeg = require('fluent-ffmpeg');
const Database = require('better-sqlite3');

const Util = require('../../shared/Util');

// TODO: Add Trie to check

class ThumbManager {

    /**
     * @param {object} data
     * @param {string} data.thumbsDir
     * @param {string} data.thumbsDbFile
     */
    constructor(data) {
        this.thumbsDir = data.thumbsDir;
        this.thumbsDbFile = data.thumbsDbFile;
    }

    init() {
        // Prepare file system structure
        fs.ensureDirSync(this.thumbsDir);
        this.db = new Database(this.thumbsDbFile);
        this.db.exec(`CREATE TABLE IF NOT EXISTS thumbnails
                      (
                        path  TEXT PRIMARY KEY UNIQUE,
                        dir   TEXT,
                        thumb TEXT,
                        epoch INTEGER
                      )`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS thumb_dir ON thumbnails (dir)`);

        // Prepare database manipulation functions
        const thumbInsert = this.db.prepare('INSERT INTO thumbnails VALUES(?, ?, ?, ?)');
        this.thumbInsert = thumbInsert.run.bind(thumbInsert);
        const thumbAll = this.db.prepare('SELECT * FROM thumbnails');
        this.thumbAll = () => {
            return thumbAll.all();
        };
        const thumbSelect = this.db.prepare('SELECT * FROM thumbnails WHERE path = ?');
        this.thumbSelect = filePath => {
            return thumbSelect.get(filePath);
        };
        const thumbDelete = this.db.prepare('DELETE FROM thumbnails WHERE path = ?');
        this.thumbDelete = filePath => thumbDelete.run(filePath);
    }

    /**
     * @param {object} data
     * @param {string} data.filePath
     * @returns {Promise.<string>}
     */
    _generateThumbnail(data) {

        let thumbName;
        let thumbPath;
        return Promise.resolve()
            .then(() => {
                const fileData = path.parse(data.filePath);
                if (!fileData.ext.endsWith('mp4')) return null;

                do {
                    const basename = Util.generateBaseName({fileName: fileData.base, groupName: 'thumb'});
                    thumbName = `${basename}.jpg`;
                    thumbPath = path.join(this.thumbsDir, thumbName);
                } while (fs.pathExistsSync(thumbPath));

                return new Promise((resolve, reject) =>
                    ffmpeg(data.filePath)
                        .on('error', error => reject(error))
                        .on('end', () => resolve(thumbName))
                        .screenshots({
                            timestamps: ['20%'],
                            filename: thumbName,
                            folder: this.thumbsDir,
                            size: '200x?',
                        }),
                );
            });

    }

    /**
     * @param {object} data
     * @param {string} data.filePath
     * @returns {Promise.<string|null>}
     */
    getThumbnail(data) {
        return fs.stat(data.filePath)
            .then(stats => {
                const thumbData = this.thumbSelect(data.filePath);

                // Check if thumbnail was previously generated
                if (!thumbData) return null;

                // Check if thumbnail exists only in the database
                const thumbPath = path.join(this.thumbsDir, thumbData.thumb);
                if (!fs.pathExistsSync(thumbPath)) {
                    this.thumbDelete(data.filePath);
                    return null;
                }

                // Check if thumbnail is outdated
                const fileEpoch = stats.mtimeMs / 1000;
                if (fileEpoch > thumbData.epoch) {
                    this.thumbDelete(data.filePath);
                    fs.unlinkSync(thumbPath);
                    return null;
                }

                // Return path to thumb if everything is ok
                return thumbPath;
            })
            .then(thumbPath => {
                if (thumbPath) return thumbPath;

                return this._generateThumbnail({filePath: data.filePath})
                    .then(generatedThumbName => {
                        // Some error occurred during generation
                        if (!generatedThumbName) return null;

                        // Store thumb data into the database
                        const dir = path.dirname(data.filePath);
                        const epoch = Math.round(new Date().getTime() / 1000);
                        this.thumbInsert(data.filePath, dir, generatedThumbName, epoch);

                        return path.join(this.thumbsDir, generatedThumbName);
                    });
            });
    }

}

module.exports = ThumbManager;
