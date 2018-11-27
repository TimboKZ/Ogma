/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

// Register Babel hooks for JSX compilation
require('babel-register')({
    presets: ['es2015', 'react'],
    plugins: ['transform-class-properties'],
});

// Include the main app
require('./electron-app.js');
