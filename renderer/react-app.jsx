/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const versions = process.versions;
console.log(`We are using: Node.js ${versions.node}, Chromium ${versions.chrome}, Electron ${versions.electron}.`);

const React = require('react');
const ReactDOM = require('react-dom');
const Promise = require('bluebird');
const {AppContainer} = require('react-hot-loader');
const {HashRouter} = require('react-router-dom');

const {HomeRoutePath} = require('../shared/typedef');
const ErrorHandler = require('./util/ErrorHandler');
const DataManager = require('./util/DataManager');
const GlobalState = require('./util/GlobalState');
const {Setting} = require('../shared/typedef');

Promise.config({
    // Disable the "a promise was created in a handler but none were returned from it" warning because our code
    // relies on this logic in many different places.
    warnings: {wForgottenReturn: false},
});

window.errorHandler = new ErrorHandler();
window.dataManager = new DataManager();
window.dataManager.init()
    .then(() => {
        window.globalState = new GlobalState();

        // Set starting page
        const lastHash = window.dataManager.getSetting(Setting.lastPageHash);
        window.location.hash = lastHash ? lastHash : `#${HomeRoutePath}`;

        // Remember last visited page
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash;
            window.dataManager.setSetting(Setting.lastPageHash, hash)
                .catch(window.errorHandler.handle);

        });

        // Render the React app
        const render = () => {
            const AppRoot = require('./components/AppRoot');
            const reactRoot = document.querySelector('#react-root');
            ReactDOM.render(<HashRouter><AppContainer><AppRoot/></AppContainer></HashRouter>, reactRoot);
        };
        render();

        // Enable hot-loading if it's supported
        if (module.hot) {
            module.hot.accept(render);
        }
    });
