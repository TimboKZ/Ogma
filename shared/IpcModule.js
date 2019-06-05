/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const _ = require('lodash');
const chalk = require('chalk');
const Promise = require('bluebird');

const SharedUtil = require('./SharedUtil');
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

        this.requestCount = 0;
        this.timeout = 5000;

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
                this.requestCount++;
                const requestId = this.requestCount;
                // TODO: Log request here.

                Promise.resolve()
                    .then(() => this[data.name](data.data, socket))
                    .then(result => {
                        // Trigger the callback
                        callback({result});

                        // Print connection information
                        const connSummary = `[IPC request] ${connId} -> ${chalk.cyan(data.name)}`;
                        const resultString = `${chalk.magenta('result')}: ${SharedUtil.toHumanReadableType(result)}`;
                        if (data.data) {
                            const dataString = `${chalk.magenta('data')}: ${JSON.stringify(data.data)}`;
                            this.logger.debug(`${connSummary}, ${dataString}, ${resultString}`);
                        } else {
                            this.logger.debug(`${connSummary}, ${resultString}`);
                        }

                    })
                    .catch(error => {
                        callback({error: error.message});
                        this.logger.error('An error occurred while processing socket action:', {
                            name: data.name,
                            data: data.data,
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

                this.requestCount++;
                const requestId = this.requestCount;
                const prefix = `[IPC Req #${requestId}]`;
                const timeout = setTimeout(() => {
                    console.warn(`${prefix} ${methodName} timed out! Data:`, methodData);
                }, this.timeout);

                const data = {name: methodName, data: methodData};
                this.socket.emit('ipc-call', data, response => {
                    clearTimeout(timeout);
                    if (response.error) reject(this.errorHandler(response.error));
                    else resolve(response.result);
                });
            });
        }
    }

    // noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
    /**
     * @param {object} [data]
     * @param {object} [socket]
     * @returns {ConnectionDetails}
     */
    getConnectionDetails(data = {}, socket) {
        // TODO: Check if socket connection comes from the same machine
        return {localClient: true};
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @returns {Promise<EnvSummary[]>}
     */
    getSummaries() {
        // noinspection JSValidateTypes
        return this.envManager.getSummaries();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     */
    getAllTags(data) {
        return this.envManager.getEnvironment({id: data.id}).getAllTags();
    }

    // noinspection JSUnusedGlobalSymbols
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

    // noinspection JSUnusedGlobalSymbols
    createEnvironment() {
        return this.envManager.createEnvironment();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id
     */
    closeEnvironment(data) {
        return this.envManager.closeEnvironment(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the directory (from environment root)
     */
    getDirectoryContents(data) {
        return this.envManager.getEnvironment(data).getDirectoryContents(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the file (from environment root)
     */
    openFile(data) {
        return this.envManager.getEnvironment(data).openFile(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the file (from environment root)
     */
    openInExplorer(data) {
        return this.envManager.getEnvironment(data).openInExplorer(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    removeFiles(data) {
        return this.envManager.getEnvironment(data).removeFiles(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.paths Array of relative paths to files (from environment root)
     */
    requestFileThumbnails(data) {
        return this.envManager.getEnvironment(data).requestThumbnails(data);
    }

    // noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
    /**
     * @param {object} data
     * @param {string} data.link
     */
    openExternalLink(data) {
        electron.shell.openExternal(data.link);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.tagNames Names of tags to add
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    addTagsToFiles(data) {
        return this.envManager.getEnvironment(data).addTagsToFiles(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.tagIds IDs of tags to remove
     * @param {string[]} data.entityIds Array of entity IDs from which to remove tags
     */
    removeTagsFromFiles(data) {
        return this.envManager.getEnvironment(data).removeTagsFromFiles(data);
    }
}

module.exports = IpcModule;
