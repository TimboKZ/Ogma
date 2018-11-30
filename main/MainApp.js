/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const os = require('os');
const path = require('path');
const {enableLiveReload} = require('electron-compile');
const {app, BrowserWindow} = require('electron');
const windowStateKeeper = require('electron-window-state');

const Util = require('../shared/Util');
const OgmaCore = require('./OgmaCore');
const IpcModule = require('../shared/IpcModule');

class MainApp {

    constructor() {
        this.mainWindow = null;

        this.ogmaDir = path.join(os.homedir(), '.ogma');
        this.ogmaCore = new OgmaCore({ogmaDir: this.ogmaDir});
        this.ipcModule = new IpcModule({mode: 'server', ogmaCore: this.ogmaCore});
    }

    init() {
        this.ogmaCore.init();
        this.ipcModule.init();

        this.setupElectronApp();
    }

    setupElectronApp() {
        app.on('ready', () => {
            enableLiveReload();
            this.createWindow();
        });
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
        const mainWindowState = windowStateKeeper({
            defaultWidth: 1280,
            defaultHeight: 860,
        });
        this.mainWindow = new BrowserWindow({
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            icon: path.join(Util.getStaticPath(), 'ogma-icon-128.png'),
        });
        mainWindowState.manage(this.mainWindow);
        this.mainWindow.loadFile(path.join(Util.getStaticPath(), 'index.html'));

        // Open the DevTools.
        this.mainWindow.webContents.openDevTools();

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }


}

module.exports = MainApp;
