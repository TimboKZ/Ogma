/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */


const MainApp = require('./MainApp');

// FIXME: Disable security warnings during development
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const mainApp = new MainApp();
mainApp.init();
