const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;

function createMainWindow() {
    const window = new BrowserWindow();

    // if (isDevelopment) {
    //     window.webContents.openDevTools();
    // }

    if (isDevelopment) {
        window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
    } else {
        window.loadURL(url.format({
            pathname: path.join(__dirname, 'start-backend.js.html'),
            protocol: 'file',
            slashes: true,
        }));
    }

    window.on('closed', () => {
        mainWindow = null;
    });

    window.webContents.on('devtools-opened', () => {
        window.focus();
        setImmediate(() => {
            window.focus();
        });
    });

    return window;
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
    // on macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // on macOS it is common to re-create a window even after all windows have been closed
    if (mainWindow === null) {
        mainWindow = createMainWindow();
    }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
    // mainWindow = createMainWindow();
    console.log('Hello world!');

    const OgmaCore = require('../../backend/OgmaCore');
    const Config = require('../../base-config');

    const core = new OgmaCore({
        host: Config.ogmaHost,
        port: Config.ogmaPort,
    });
    core.init();
});
