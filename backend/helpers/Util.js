/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const path = require('path');
const {createLogger, format, transports} = require('winston');

const packageRoot = path.normalize(path.join(__dirname, '..', '..'));
const packageInfo = require('../../package');

const logger = createLogger({
    transports: [new transports.Console()],
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm',
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
});

class Util {

    static getPackageVersion() {
        return packageInfo.version;
    }

    static getLogger() {
        return logger;
    }

    static isDevelopment() {
        return process.env.NODE_ENV !== 'production';
    }

}

module.exports = Util;
