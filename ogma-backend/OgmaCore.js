/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const {app, BrowserWindow} = require('electron');
const windowStateKeeper = require('electron-window-state');

const Util = require('./helpers/Util');
const Config = require('./helpers/Config');
const Server = require('./helpers/Server');
const EnvironmentManager = require('./helpers/EnvironmentManager');

class OgmaCore {

    /**
     * @param {object} data
     * @param {string} data.host
     * @param {number} data.port
     */
    constructor(data) {
        this.host = data.host;
        this.port = data.port;

        this.ogmaHomePath = path.join(os.homedir(), '.ogma');
        this.ogmaConfigPath = path.join(this.ogmaHomePath, 'ogmarc.json');

        this.config = null;
        this.envManager = null;
        this.server = null;

        this.mainWindow = null;
    }

    init() {
        return Promise.resolve()
            .then(() => {
                fs.ensureDirSync(this.ogmaHomePath);
                this.config = new Config({configPath: this.ogmaConfigPath});
                this.envManager = new EnvironmentManager({config: this.config});
                this.server = new Server({port: this.port, envManager: this.envManager});

                this.server.start();
                this.setupElectronApp();
            });
    }

    setupElectronApp() {
        app.on('ready', () => {
            // TODO: uncomment below before packaging
            // this.createWindow();
        });
        app.on('window-all-closed', () => {
            // On macOS it is common for applications and their menu bar
            // to stay active until the user quits explicitly with Cmd + Q

            // TODO: Let users quit via systray
            // if (process.platform !== 'darwin') app.quit();
        });
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (this.mainWindow === null) this.createWindow();
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

        if (Util.isDevelopment()) {
            this.mainWindow.loadURL('http://localhost:3000');
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(path.join(Util.getStaticPath(), 'index.html'));
        }

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

}

module.exports = OgmaCore;
