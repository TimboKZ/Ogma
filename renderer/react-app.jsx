/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

console.log(`We are using:
- Node.js ${process.versions.node}
- Chromium ${process.versions.chrome}
- Electron ${process.versions.electron}`);

const React = require('react');
const ReactDOM = require('react-dom');
const {AppContainer} = require('react-hot-loader');

const DataManager = require('./components/util/DataManager');

window.dataManager = new DataManager();
window.dataManager._ensureEnvSummaries()
    .then(() => {
        const render = () => {
            const AppRoot = require('./components/AppRoot');
            const reactRoot = document.querySelector('#react-root');
            ReactDOM.render(<AppContainer><AppRoot/></AppContainer>, reactRoot);
        };

        render();
        if (module.hot) {
            module.hot.accept(render);
        }
    });
