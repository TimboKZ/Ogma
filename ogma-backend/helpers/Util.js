/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const path = require('path');
const crypto = require('crypto');
const shortid = require('shortid');

const Logger = require('./Logger');

const packageRoot = path.normalize(path.join(__dirname, '..', '..'));
const packageInfo = require('../../package');
const staticPath = path.normalize(path.join(packageRoot, 'ogma-frontend', 'build'));

class Util {

    static getPackageVersion() {
        return packageInfo.version;
    }

    static getLogger() {
        return Logger;
    }

    static getStaticPath() {
        return staticPath;
    }

    static getId() {
        return shortid.generate();
    }

    static getMd5(string) {
        return crypto.createHash('md5').update(string).digest('hex');
    }

    static isDevelopment() {
        return process.env.NODE_ENV !== 'production';
    }

    static prepSqlGet(db, statement) {
        const stmt = db.prepare(statement);
        return stmt.get.bind(stmt);
    }

    static prepSqlRun(db, statement) {
        const stmt = db.prepare(statement);
        return stmt.run.bind(stmt);
    }

}

module.exports = Util;
