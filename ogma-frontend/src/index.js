/* global $ */
/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import Promise from 'bluebird';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {EventEmitter2} from 'eventemitter2';
import {configureStore} from 'redux-starter-kit';
import 'react-notifications/lib/notifications.css';
import ReconnectingWebSocket from 'reconnecting-websocket';
import 'bulma-extensions/dist/css/bulma-extensions.min.css';
import {NotificationContainer, NotificationManager} from 'react-notifications';

import './scss/index.scss';
import App from './react/App';
import IpcModule from './util/IpcModule';
import baseConfig from '../../base-config';
import DataManager from './util/DataManager';
import ErrorHandler from './util/ErrorHandler';
import ogmaAppReducer from './redux/OgmaAppReducer';
import * as serviceWorker from './util/serviceWorker';

Promise.config({
    cancellation: true,
    warnings: {
        wForgottenReturn: false,
    },
});

// Init basic window params
window.isDevelopment = process.env.NODE_ENV !== 'production';

window.handleError = ErrorHandler.handleMiscError;
window.handleErrorQuiet = ErrorHandler.handleMiscErrorQuiet;

if (window.isDevelopment) {
    console.log('Ogma app running in development mode.');
    window.serverHost = `http://${baseConfig.host}:${baseConfig.webPort}`;
} else {
    window.serverHost = '';
}

// Initialize notification component (only need to do this once)
ReactDOM.render(<NotificationContainer/>, document.getElementById('notif'));

// Socket.IO connection logic
const socketInitPromise = new Promise(resolve => {
    const socket = new ReconnectingWebSocket(`ws://${baseConfig.host}:${baseConfig.socketPort}`);

    let firstConnection = true;
    socket.addEventListener('open', () => {
        NotificationManager.success('Successfully connected to Ogma server.');
        console.log('[WS] Connected to socket.');

        if (firstConnection) {
            firstConnection = false;
            resolve(socket);
        }
    });
    socket.addEventListener('close', () => {
        NotificationManager.warning('Lost connection to server!');
    });
    socket.addEventListener('error', error => {
        NotificationManager.error('Error occurred when connecting to server.');
        console.error('Error occurred while establishing socket connection:', error.message);
    });
});

// Prepare loader reference
const appLoaderDiv = $('#app-loader');

// Initialize the rest of the app if socket connection succeeded
socketInitPromise
    .then(socket => {
        // Setup the event emitter
        window.proxyEmitter = new EventEmitter2({wildcard: true, newListener: false, maxListeners: 20});
        // Setup module for backend communication
        window.ipcModule = new IpcModule({socket, emitter: window.proxyEmitter});
        return socket;
    })
    .then(socket => {
        const store = configureStore({reducer: ogmaAppReducer});
        window.store = store;
        window.dataManager = new DataManager(socket, store);
        return window.dataManager.init()
            .then(() => store);
    })
    .then(store => {
        appLoaderDiv.hide();
        ReactDOM.render(<Provider store={store}><App/></Provider>, document.getElementById('root'));
    })
    .catch(error => {
        console.error(error);
        const errorDiv = $('#app-loader-message');
        errorDiv.addClass('error');
        errorDiv.html(`Startup error: &nbsp;<strong>${error.message}</strong>`);
    });

// Do nothing with server workers since we don't support them yet
serviceWorker.unregister();
