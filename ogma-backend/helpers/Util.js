/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const path = require('path');
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

    static isDevelopment() {
        return process.env.NODE_ENV !== 'production';
    }

}

module.exports = Util;
