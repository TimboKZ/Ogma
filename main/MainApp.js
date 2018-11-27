/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const os = require('os');
const path = require('path');
const {app, BrowserWindow} = require('electron');

const OgmaCore = require('./OgmaCore');
const IpcModule = require('./IpcModule');

const StaticPath = path.normalize(path.join(__dirname, '..', 'static'));

class MainApp {

    /**
     * @param {object} data
     */
    constructor(data) {
        this.mainWindow = null;

        this.ogmaDir = path.join(os.homedir(), '.ogma');
        this.ogmaCore = new OgmaCore({ogmaDir: this.ogmaDir});
        this.ipcModule = new IpcModule({mainApp: this, ogmaCore: this.ogmaCore});
    }

    init() {
        this.ogmaCore.init();
        this.ipcModule.init();

        this.setupElectronApp();
    }

    setupElectronApp() {
        app.on('ready', this.createWindow.bind(this));
        app.on('window-all-closed', () => {
            // On macOS it is common for applications and their menu bar
            // to stay active until the user quits explicitly with Cmd + Q
            if (process.platform !== 'darwin') app.quit();
        });
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (this.mainWindow === null) this.createWindow.bind(this);
        });
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            icon: path.join(StaticPath, 'ogma-icon-128.png'),
        });
        this.mainWindow.loadFile(path.join(StaticPath, 'index.html'));

        // Open the DevTools.
        this.mainWindow.webContents.openDevTools();

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }


}

module.exports = MainApp;
