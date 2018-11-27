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

const AppRoot = require('./components/AppRoot');

const reactRoot = document.querySelector('#react-root');
ReactDOM.render(<AppRoot/>, reactRoot);
