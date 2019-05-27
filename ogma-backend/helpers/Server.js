/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const cors = require('cors');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const Util = require('./Util');
const {BackendEvents} = require('../typedef');

const logger = Util.getLogger();

class Server {

    /**
     * @param {object} data
     * @param {EventEmitter} data.emitter
     * @param {number} data.port
     * @param {EnvironmentManager} data.envManager
     */
    constructor(data) {
        this.port = data.port;
        this.emitter = data.emitter;
        this.envManager = data.envManager;
    }

    init() {
        this.expressApp = express();
        this.expressApp.use(cors());

        this.httpServer = http.Server(this.expressApp);
        this.socketIO = socketIO(this.httpServer);

        this.setupSocket();
        this.setupActions();
        this.setupListeners();
    }

    setupSocket() {
        this.socketIO.on('connection', socket => {
            const connId = socket.id;
            const remoteAddress = socket.request.connection.remoteAddress;
            logger.info(`New connection: ${connId} from ${remoteAddress}`);

            const response = this.processConnection(socket);
            socket.on('hello', callback => {
                callback(response);
            });
            socket.on('action', (name, data, callback) => {
                logger.info(`Processing action "${name}" from ${connId}.`);
                Promise.resolve()
                    .then(() => this.processSocketAction({name, data}))
                    .then(result => callback({result}))
                    .catch(error => {
                        callback({error: error.message});
                        logger.error('An error occurred while processing socket action:', {name, data}, '\n', error);
                    });
            });
        });
    }

    setupActions() {
        this.actionMap = {};

        this.actionMap['create-environment'] = () => {
            // TODO: Check if client is local.
            return this.envManager.createEnvironment();
        };

        this.actionMap['get-env-summaries'] = () => {
            return this.envManager.getSummaries();
        };
    }

    setupListeners() {
        const eventsToForward = [BackendEvents.UpdateEnvSummaries];
        const eventsForwardMap = {};
        for (const eventName of eventsToForward) eventsForwardMap[eventName] = true;

        // Broadcast selected events to clients
        const that = this;
        this.emitter.addListener('*', function (...args) {
            const eventName = this.event;
            if (!eventsForwardMap[eventName]) return;
            that.socketIO.sockets.emit('forward-event', {name: eventName, args});
        });
    }

    /**
     * @param {object} data
     * @param {*} data.name
     * @param {*} [data.data]
     */
    processSocketAction(data) {
        const actionFunc = this.actionMap[data.name];
        if (actionFunc) {
            return Promise.resolve()
                .then(() => actionFunc(data.data));
        } else {
            return Promise.reject(new Error(`Unknown socket action: ${data.name}`));
        }
    }

    /**
     * Returns basic information the client should know - this information should be invariant, i.e. it shouldn't
     * change if the client will try to reconnect again.
     *
     * @param {object} socket
     * @returns {HelloResponse}
     */
    processConnection(socket) {
        // TODO: Verify that socket comes from a local address.
        return {localClient: true};
    }

    start() {
        this.httpServer.listen(this.port, () => {
            logger.info(`Server listening on port ${this.port}!`);
        });
    }

}

module.exports = Server;
