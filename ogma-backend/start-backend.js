/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const OgmaCore = require('./OgmaCore');
const Config = require('../base-config');

const core = new OgmaCore({
    host: Config.ogmaHost,
    port: Config.ogmaPort,
});
core.init();
