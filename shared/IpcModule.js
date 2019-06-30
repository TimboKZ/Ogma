/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const _ = require('lodash');
const {cyan, green, magenta, red, yellow} = require('chalk');
const Promise = require('bluebird');
const ExactTrie = require('exact-trie');

const SharedUtil = require('./SharedUtil');
const {BackendEvents} = require('./typedef');

const isServer = typeof window === 'undefined';
let Util = null;
let electron = null;
let uaParser = null;
if (isServer) {
    Util = require('../ogma-backend/helpers/Util');
    electron = require('electron');
    uaParser = require('ua-parser-js');
}

class IpcModule {

    /**
     * @param {object} data
     * @param {object} data.socket
     * @param {Logger} [data.logger] For server mode
     * @param {OgmaCore} [data.ogmaCore] For server mode
     * @param {string[]} [data.localIps] For server mode
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

            this.localIpTrie = new ExactTrie({ignoreCase: false}).putAll(data.localIps, true);
            this.clientMap = {};

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
            // if (!ForwardedEventsMap[eventName]) return;
            that.socket.sockets.emit('ipc-forward-event', {name: eventName, args});
        });

        // Process messages from clients
        this.socket.on('connection', socket => {
            const client = this._prepareClientDetails(socket);
            this._addClient(client);

            const addressString = `${client.ip}, ${client.userAgent.browser.name} on ${client.userAgent.os.name}`;
            this.logger.info(`${green('Connected')}: ${cyan(client.id)} from <${magenta(addressString)}>`);
            socket.on('disconnect', () => {
                this._removeClient(client);
                this.logger.info(`${red('Disconnected')}: ${cyan(client.id)} from <${magenta(addressString)}>`);
            });

            socket.on('ipc-call', (data, callback) => {
                this.requestCount++;
                // TODO: Log request here with `setTimeout`.

                Promise.resolve()
                    .then(() => this[data.name](data.data, client))
                    .then(result => {
                        // Trigger the callback
                        callback({result});

                        // Print connection information
                        const connSummary = `[IPC request] ${client.id} -> ${cyan(data.name)}`;
                        const resultString = `${magenta('result')}: ${SharedUtil.toHumanReadableType(result)}`;
                        if (data.data) {
                            const dataString = `${magenta('data')}: ${JSON.stringify(data.data)}`;
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

    /**
     * @param {object} socket
     * @returns {ClientDetails}
     * @private
     */
    _prepareClientDetails(socket) {
        const id = Util.getShortId();
        let ip = socket.client.request.headers['x-forwarded-for']
            || socket.client.conn.remoteAddress
            || socket.conn.remoteAddress
            || socket.request.connection.remoteAddress;
        let localClient = false;
        const userAgent = uaParser(socket.handshake.headers['user-agent']);

        // Determine if connection comes from a local client
        if (ip === '::1') {
            ip = 'local';
            localClient = true;
        } else if (ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
            if (this.localIpTrie.has(ip)) {
                localClient = true;
            }
        } else {
            // TODO: Need to support IPv6...
        }

        return {
            id,
            ip,
            localClient,
            userAgent,
            socket,
        };
    }

    _addClient(client) {
        this.clientMap[client.id] = client;
        this.emitter.emit(BackendEvents.AddConnection, {
            id: client.id,
            ip: client.ip,
            localClient: client.localClient,
            userAgent: client.userAgent,
        });
    }

    _removeClient(client) {
        delete this.clientMap[client.id];
        this.emitter.emit(BackendEvents.RemoveConnection, client.id);
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
     * @param {object} [client]
     * @returns {ConnectionDetails}
     */
    getClientDetails(data = null, client) {
        return {
            id: client.id,
            localClient: client.localClient,
        };
    }

    // noinspection JSUnusedGlobalSymbols
    getClientList() {
        const clients = Object.values(this.clientMap);
        return clients.map(client => ({
            id: client.id,
            ip: client.ip,
            localClient: client.localClient,
            userAgent: client.userAgent,
        }));
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     */
    getAllEntities(data) {
        return this.envManager.getEnvironment(data).getAllEntities();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.entityIds Entity IDs for each file details will be fetched.
     * @returns {Promise.<(FileDetails||FileErrorStatus)[]>}
     */
    getEntityFiles(data) {
        return this.envManager.getEnvironment(data).getEntityFiles(data);
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
        return this.envManager.getEnvironment(data).setProperty(data);
    }

    // noinspection JSUnusedGlobalSymbols
    createEnvironment(_, client) {
        if (!client.localClient) {
            throw new Error('Only local clients can create new environment!');
        }
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
     * @param {RelPath} data.path Path relative to environment root
     * @param {string[]} data.cachedHashes Hashes that are assumed to be in this directory
     * @param {number} data.dirReadTime Time (in seconds) when the directory was initially read
     */
    scanDirectoryForChanges(data) {
      return this.envManager.getEnvironment(data).scanDirectoryForChanges(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the file (from environment root)
     * @param {ClientDetails} [client]
     */
    openFile(data, client) {
        if (!client.localClient) throw new Error('Only local clients can open files natively!');
        return this.envManager.getEnvironment(data).openFile(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the file (from environment root)
     * @param {ClientDetails} [client]
     */
    openInExplorer(data, client) {
        if (!client.localClient) throw new Error('Only local clients can open files in explorer!');
        return this.envManager.getEnvironment(data).openInExplorer(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.paths Paths to files that will be sorted to sinks.
     */
    moveFilesToSink(data) {
        return this.envManager.getEnvironment(data).moveFilesToSinks(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Path to the new folder.
     */
    createFolder(data) {
        return this.envManager.getEnvironment(data).createFolder(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.oldPath Current path to the file, relative to environment root.
     * @param {string} data.newPath New path to the file, relative to environment root.
     * @param {boolean} [data.overwrite=false] Whether to overwrite if the new file already exists
     */
    renameFile(data) {
        return this.envManager.getEnvironment(data).renameFile(data);
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
     * @param {ClientDetails} [client]
     */
    openExternalLink(data, client) {
        if (!client.localClient) throw new Error('Only local clients can open external links!');
        electron.shell.openExternal(data.link);
    }
}

module.exports = IpcModule;
