/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const _ = require('lodash');
const Promise = require('bluebird');

const {ForwardedEventsMap} = require('./typedef');

const isServer = typeof window === 'undefined';
let Util = null;
let electron = null;
if (isServer) {
    Util = require('../ogma-backend/helpers/Util');
    electron = require('electron');
}

class IpcModule {

    /**
     * @param {object} data
     * @param {object} data.socket
     * @param {Logger} [data.logger] For server mode
     * @param {OgmaCore} [data.ogmaCore] For server mode
     * @param {function(data: *)} [data.eventHandler] For client mode
     * @param {function(error: string)} [data.errorHandler] For client mode
     */
    constructor(data) {
        this.socket = data.socket;
        this.logger = data.logger;

        this.serverMethods = Object.getOwnPropertyNames(IpcModule.prototype);
        this.serverMethods = _.filter(this.serverMethods, m => !(m.startsWith('_') || m === 'constructor'));

        if (isServer) {
            this.ogmaCore = data.ogmaCore;
            this.emitter = this.ogmaCore.emitter;
            this.envManager = this.ogmaCore.envManager;
            this._setupServerSocket();
        } else {
            this.eventHandler = data.eventHandler;
            this.errorHandler = data.errorHandler;
            this._setupClientSocket();
        }
    }

    _setupServerSocket() {
        // Broadcast selected events to clients
        const that = this;
        this.emitter.addListener('*', function (...args) {
            const eventName = this.event;
            if (!ForwardedEventsMap[eventName]) return;
            that.socket.sockets.emit('ipc-forward-event', {name: eventName, args});
        });

        // Process messages from clients
        this.socket.on('connection', socket => {
            const connId = socket.id;
            const remoteAddress = socket.request.connection.remoteAddress;
            this.logger.info(`New connection: ${connId} from ${remoteAddress}`);

            socket.on('ipc-call', (data, callback) => {
                this.logger.debug(`Processing IPC method "${data.name}" from "${connId}" with data:`, data.data);

                Promise.resolve()
                    .then(() => this[data.name](data.data, socket))
                    .then(result => callback({result}))
                    .catch(error => {
                        callback({error: error.message});
                        this.logger.error('An error occurred while processing socket action:', {
                            name,
                            data,
                        }, '\n', error);
                    });
            });
        });
    }

    _setupClientSocket() {
        // Process forwarded events
        this.socket.on('ipc-forward-event', eventData => this.eventHandler(eventData));

        // Forward method calls to backend
        for (const methodName of this.serverMethods) {
            this[methodName] = methodData => new Promise((resolve, reject) => {
                const data = {name: methodName, data: methodData};
                this.socket.emit('ipc-call', data, response => {
                    if (response.error) reject(this.errorHandler(response.error));
                    else resolve(response.result);
                });
            });
        }
    }

    /**
     * @param {object} [data]
     * @param {object} [socket]
     * @returns {ConnectionDetails}
     */
    getConnectionDetails(data = {}, socket) {
        // TODO: Check if socket connection comes from the same machine
        return {localClient: true};
    }

    /**
     * @returns {Promise<EnvSummary[]>}
     */
    getEnvSummaries() {
        // noinspection JSValidateTypes
        return this.envManager.getSummaries();
    }

    /**
     * @param {object} data
     * @param {string} data.id
     * @param {string} [data.slug]
     * @param {string} [data.name]
     * @param {string} [data.icon]
     * @param {string} [data.color]
     */
    setEnvProperty(data) {
        return this.envManager.getEnvironment({id: data.id}).setProperty(data);
    }

    createEnvironment() {
        return this.envManager.createEnvironment();
    }

    /**
     * @param {object} data
     * @param {string} data.id
     */
    closeEnvironment(data) {
        return this.envManager.closeEnvironment(data);
    }

    /**
     * @param {object} data
     * @param {string} data.link
     */
    openExternalLink(data) {
        electron.shell.openExternal(data.link);
    }
}

module.exports = IpcModule;
