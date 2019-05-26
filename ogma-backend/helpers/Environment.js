/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

class Environment {

    /**
     * @param {object} data
     * @param {string} data.envPath Absolute path to the environment, can be OS specific
     */
    constructor(data) {
        this.envPath = data.envPath;
    }

    getPath() {
        return this.envPath;
    }

}

module.exports = Environment;
