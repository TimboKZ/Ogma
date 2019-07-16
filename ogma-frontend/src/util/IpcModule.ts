/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import Promise from 'bluebird';
import {UserFriendlyError} from './ErrorHandler';

type IpcAction = {
    id?: number,
    name: string,
    error?: string,
    payload: any,
}
type IpcCallback = (payload: IpcAction) => void;
type IpcEvent = {
    name: string,
    data: any,
}

export type ClientDetails = {
    id: string,
    ip: string,
    localClient: boolean,
    userAgent: string,
}

export default class IpcModule {

    socket: any;
    emitter: any;
    requestCount: number;
    timeout: 5000;
    serverMethods: string[];
    callbackMap: { [reqId: string]: IpcCallback };
    placeholderPromise: Promise<any>;

    /**
     * @deprecated
     */
    envManager: any;

    constructor(data: { socket: any, emitter: any }) {
        this.socket = data.socket;
        this.emitter = data.emitter;

        this.requestCount = 0;
        this.timeout = 5000;

        this.serverMethods = Object.getOwnPropertyNames(IpcModule.prototype);
        this.serverMethods = _.filter(this.serverMethods, m => !(m.startsWith('_') || m === 'constructor'));

        this.callbackMap = {};
        this.placeholderPromise = Promise.resolve();

        this._setupClientSocket();
    }

    _requestAction(action: IpcAction, callback?: IpcCallback) {
        if (callback) {
            if (action.id) this.callbackMap[action.id] = callback;
            else console.warn(`Specified callback for action with no ID: ${action}`);
        }
        this.socket.send(JSON.stringify(action));
    }

    _setupClientSocket() {
        // Process incoming messages
        this.socket.addEventListener('message', (event: any) => {
            const action = JSON.parse(event.data) as IpcAction;
            if (action.id) {
                console.log('[IPC] Received callback action:', action);
                const callback = this.callbackMap[action.id];
                delete this.callbackMap[action.id];
                if (callback) callback(action);
            } else if (action.name === 'ipc-forward-event') {
                const event = action.payload as IpcEvent;
                console.log('[IPC] Received backend event:', event);
                this.emitter.emit(event.name, event.data);
            } else {
                console.warn('[IPC] Received unhandled action:', action);
            }
        });

        // Forward method calls to backend
        for (const methodName of this.serverMethods) {
            // @ts-ignore
            this[methodName] = (payload: any) => new Promise((resolve, reject) => {

                this.requestCount++;
                const requestId = this.requestCount;
                const action = {id: requestId, name: methodName, payload};

                const timeout = setTimeout(() => {
                    console.warn(`[IPC] Action request timeout:`, action);
                }, this.timeout);

                this._requestAction(action, (response: IpcAction) => {
                    clearTimeout(timeout);
                    if (response.error) {
                        reject(new UserFriendlyError({
                            title: 'Server-side error',
                            message: `Server has encountered an error: "${response.error}"`,
                        }));
                    } else {
                        resolve(response.payload);
                    }
                });
            });
        }
    }

    getClientDetails(): Promise<ClientDetails> { return this.placeholderPromise;}

    getClientList(): Promise<ClientDetails[]> { return this.placeholderPromise;}

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
    // @ts-ignore
    getAllTags(data) {
        return this.envManager.getEnvironment({id: data.id}).getAllTags();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {DBTag} data.tag New tag definition
     */
    // @ts-ignore
    updateTag(data) {
        return this.envManager.getEnvironment({id: data.id}).updateTag(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.tagId ID of the tag to delete
     */
    // @ts-ignore
    removeTag(data) {
        return this.envManager.getEnvironment({id: data.id}).removeTag(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.tagNames Names of tags to add
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    // @ts-ignore
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
    // @ts-ignore
    removeTagsFromFiles(data) {
        return this.envManager.getEnvironment(data).removeTagsFromFiles(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     */
    // @ts-ignore
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
    // @ts-ignore
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
    // @ts-ignore
    setEnvProperty(data) {
        return this.envManager.getEnvironment(data).setProperty(data);
    }

    // noinspection JSUnusedGlobalSymbols
    // @ts-ignore
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
    // @ts-ignore
    closeEnvironment(data) {
        return this.envManager.closeEnvironment(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Relative path of the directory (from environment root)
     */
    // @ts-ignore
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
     * @returns {Promise.<FileDetails>} Directory details
     */
    // @ts-ignore
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
    // @ts-ignore
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
    // @ts-ignore
    openInExplorer(data, client) {
        if (!client.localClient) throw new Error('Only local clients can open files in explorer!');
        return this.envManager.getEnvironment(data).openInExplorer(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     */
    // @ts-ignore
    getSinkTreeSnapshot(data) {
        return this.envManager.getEnvironment(data).getSinkTreeSnapshot();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.paths Paths to files that will be sorted to sinks.
     */
    // @ts-ignore
    moveFilesToSink(data) {
        return this.envManager.getEnvironment(data).moveFilesToSinks(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string} data.path Path to the new folder.
     */
    // @ts-ignore
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
    // @ts-ignore
    renameFile(data) {
        return this.envManager.getEnvironment(data).renameFile(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.paths Array of relative paths of the file (from environment root)
     */
    // @ts-ignore
    removeFiles(data) {
        return this.envManager.getEnvironment(data).removeFiles(data);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {object} data
     * @param {string} data.id Environment ID
     * @param {string[]} data.paths Array of relative paths to files (from environment root)
     */
    // @ts-ignore
    requestFileThumbnails(data) {
        return this.envManager.getEnvironment(data).requestThumbnails(data);
    }

    // noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
    /**
     * @param {object} data
     * @param {string} data.link
     * @param {ClientDetails} [client]
     */
    // @ts-ignore
    openExternalLink(data, client) {
        if (!client.localClient) throw new Error('Only local clients can open external links!');
        // electron.shell.openExternal(data.link);
    }
}
