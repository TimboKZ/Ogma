/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');

const appRoot = path.resolve(path.join(__dirname, '..'));

require('electron-compile').init(appRoot, require.resolve('./electron-app.js'));
