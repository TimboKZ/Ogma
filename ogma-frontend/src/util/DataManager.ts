/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import Denque from 'denque';
import {Store} from 'redux';
import Promise from 'bluebird';
import {UAParser} from 'ua-parser-js';
import {EventEmitter2} from 'eventemitter2';
import ReconnectingWebSocket from 'reconnecting-websocket';

import {ClientDetails} from './IpcModule';
import ErrorHandler from './ErrorHandler';
import {BackendEvents, FileErrorStatus} from './typedef';
import {Dispatcher, EnvDispatcher} from '../redux/Action';
import {File, AppState, ReduxAction, Client} from '../redux/ReduxTypedef';

export default class DataManager {

    socket: ReconnectingWebSocket;
    store: Store<AppState, ReduxAction>;
    emitter: EventEmitter2;
    uaParser: UAParser;

    lastThumbRequestEnvId: string;
    thumbRequestQueue: Denque;
    _debounceRequestBatchThumbnails: () => void;

    constructor(socket: ReconnectingWebSocket, store: Store<AppState, ReduxAction>) {
        this.socket = socket;
        this.store = store;
        this.emitter = window.proxyEmitter;
        this.uaParser = new UAParser();

        this.lastThumbRequestEnvId = '';
        this.thumbRequestQueue = new Denque();
        this._debounceRequestBatchThumbnails = _.debounce(this._requestBatchThumbnails, 100);
    }

    init() {
        // Setup reconnect logic
        this.socket.addEventListener('open', () => {
            this._syncBaseState()
                .catch(ErrorHandler.handleMiscError);
        });

        // Setup listeners
        type BackendEventHandler = (data?: any) => void;
        const listenerMap: { [eventName: string]: BackendEventHandler } = {
            [BackendEvents.AddConnection]: (clientDetails: ClientDetails) => {
                Dispatcher.addConnection(this._parseClientDetails(clientDetails));
            },
            [BackendEvents.RemoveConnection]: Dispatcher.removeConnection,

            [BackendEvents.CreateEnvironment]: data => {
                EnvDispatcher.updateSummary(data.id, data.summary);
                this._fetchEnvDetails(data.id)
                    .catch(window.handleError);
            },
            [BackendEvents.CloseEnvironment]: Dispatcher.closeEnvironment,

            [BackendEvents.EnvUpdateSummary]: summary => EnvDispatcher.updateSummary(summary.id, summary),

            [BackendEvents.EnvAddEntities]: data => EnvDispatcher.updateEntities(data.id, data.entities),
            [BackendEvents.EnvRemoveEntities]: data => EnvDispatcher.removeEntities(data.id, data.entityIds),
            [BackendEvents.EnvUpdateEntities]: data => EnvDispatcher.updateEntities(data.id, data.entities),

            [BackendEvents.EnvUpdateFiles]: data => EnvDispatcher.updateFiles(data.id, data.files),
            [BackendEvents.EnvRemoveFiles]: data => EnvDispatcher.removeFiles(data.id, data.hashes),
            [BackendEvents.EnvUpdateThumbs]: data => EnvDispatcher.updateThumbStates(data.id, data.thumbs, data.thumbState),

            [BackendEvents.EnvAddTags]: data => EnvDispatcher.updateTags(data.id, data.tags),
            [BackendEvents.EnvRemoveTags]: data => EnvDispatcher.removeTags(data.id, data.tagIds),
            [BackendEvents.EnvUpdateTags]: data => EnvDispatcher.updateTags(data.id, data.tags),
            [BackendEvents.EnvTagFiles]: data => EnvDispatcher.tagFiles(data.id, data.entities, data.tagIds),
            [BackendEvents.EnvUntagFiles]: data => EnvDispatcher.untagFiles(data.id, data.entityIds, data.tagIds),

            [BackendEvents.EnvUpdateSinkTree]: data => EnvDispatcher.applySinkTreeDiff(data.id, data.delta),
        };
        for (const eventName in BackendEvents) {
            if (!listenerMap[BackendEvents[eventName]]) {
                console.warn(`Backend event "${eventName}" does not have a listener `);
            }
        }
        this.emitter.on('*', function (...args) {
            // @ts-ignore
            const eventName = this.event;
            const listener = listenerMap[eventName];
            if (window.isDevelopment) console.log(`[ProxyEmitter] Received event ${eventName} from backend.`);
            if (!listener) return;
            listener(...args);
        });

        // Attempt initial sync
        return this._syncBaseState();
    }

    _parseClientDetails = (clientDetails: ClientDetails): Client => {
        this.uaParser.setUA(clientDetails.userAgent);
        return {
            ...clientDetails,
            ip: clientDetails.ip.replace('::ffff:192', '192'),
            userAgent: this.uaParser.getResult(),
        };
    };

    _syncBaseState() {
        return Promise.all([window.ipcModule.getClientDetails(), window.ipcModule.getClientList()])
            .then(result => {
                const [clientDetails, clientList] = result;
                Dispatcher.setClientDetails(this._parseClientDetails(clientDetails));
                Dispatcher.setClientList(clientList.map(this._parseClientDetails));
                return window.ipcModule.getSummaries();
            })
            .then(summaries => {
                Dispatcher.setSummaries(summaries);
                const envPromises = new Array(summaries.length);
                for (let i = 0; i < summaries.length; ++i) {
                    const summary = summaries[i];
                    envPromises[i] = this._fetchEnvDetails(summary.id);
                }
                return Promise.all(envPromises);
            })
            .catch(window.handleError);
    }

    /**
     * @param id
     * @private
     */
    _fetchEnvDetails(id: string) {
        const data = {id};
        return Promise.all([
            window.ipcModule.getAllTags(data),
            window.ipcModule.getAllEntities(data),
            window.ipcModule.getSinkTreeSnapshot(data),
        ])
            .then(result => {
                const [allTags, allEntities, sinkTreeSnapshot] = result;
                EnvDispatcher.setAllTags(data.id, allTags);
                EnvDispatcher.setAllEntities(data.id, allEntities);
                EnvDispatcher.setSinkTree(data.id, sinkTreeSnapshot);
            });
    }

    /**
     * @param id Environment ID
     * @param path Path relative to environment route
     * @param dirReadTime Timestamp at which directory was last read
     * @param cachedHashes Previously cached hashes
     */
    requestDirectoryContent(id: string, path: string, dirReadTime: number, cachedHashes: string[]) {
        if (cachedHashes) {
            const data = {id, path, dirReadTime, cachedHashes};
            return window.ipcModule.scanDirectoryForChanges(data)
                .then((fileDetails: any) => {
                    EnvDispatcher.updateDirectory(data.id, fileDetails);
                });
        }
        return window.ipcModule.getDirectoryContents({id, path})
            .then((result) => {
                const {directory, files} = result;
                EnvDispatcher.updateFiles(id, files.concat([directory]));
                EnvDispatcher.updateDirectory(id, directory, files.map(f => f.hash));
                return null;
            });
    }

    _requestBatchThumbnails() {
        const newDenque = new Denque();
        const envId = this.lastThumbRequestEnvId;
        const requestQueue = this.thumbRequestQueue;
        this.thumbRequestQueue = newDenque;

        window.ipcModule.requestFileThumbnails({id: envId, paths: requestQueue.toArray()});
    }

    /**
     * @param id Environment ID
     * @param path Relative path of the file (from environment root)
     */
    requestFileThumbnail(id: string, path: string) {
        const data = {id, path};
        this.lastThumbRequestEnvId = data.id;
        this.thumbRequestQueue.push(data.path);
        this._debounceRequestBatchThumbnails();
    }

    /**
     * @param id Environment ID
     * @param entityIds Entity IDs for each file details will be fetched
     */
    requestEntityFiles(id: string, entityIds: string[]) {
        const data = {id, entityIds};
        const chunks = _.chunk(data.entityIds, 75);
        const promises = chunks.map(ch => window.ipcModule.getEntityFiles({id: data.id, entityIds: ch}));
        return Promise.all(promises)
            .then(chunks => {
                const entityFiles = _.flattenDeep(chunks);
                const newFileQueue = new Denque();
                const badHashQueue = new Denque();
                for (let i = 0; i < entityFiles.length; ++i) {
                    const file = entityFiles[i];
                    if (_.isNumber(file)) {
                        const badEntityIds = data.entityIds[i];
                        if (file === FileErrorStatus.FileDoesntExist) {
                            console.warn(`Encountered FileDoesntExist code, entity ID: ${badEntityIds}`);
                        } else if (file === FileErrorStatus.EntityDoesntExist) {
                            console.warn(`Encountered EntityDoesntExist code, entity ID: ${badEntityIds}`);
                        } else {
                            console.warn(`Encountered unknown FileErrorStatus code: ${file}`);
                        }
                    } else {
                        newFileQueue.push(file);
                    }
                }

                if (badHashQueue.length > 0) {
                    EnvDispatcher.removeFiles(data.id, badHashQueue.toArray());
                }
                EnvDispatcher.updateFiles(data.id, newFileQueue.toArray());
                return null;
            });
    }

    isLocalClient() {
        return this.store.getState().client.localClient;
    }

    // noinspection JSMethodCanBeStatic
    isElectron() {
        return navigator.userAgent.includes('Electron/');
    }

}
