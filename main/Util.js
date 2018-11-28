/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');

class Util {

    static getStaticPath() {
        return path.normalize(path.join(__dirname, '..', 'static'));
    }

}

module.exports = Util;
