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

const logger = Util.getLogger();

class Server {

    /**
     * @param {object} data
     * @param {number} data.port
     * @param {EnvironmentManager} data.envManager
     */
    constructor(data) {
        this.port = data.port;
        this.envManager = data.envManager;

        this.expressApp = express();
        this.expressApp.use(cors());

        this.httpServer = http.Server(this.expressApp);
        this.socketIO = socketIO(this.httpServer);

        this.setupSocket();
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
                this.processSocketAction({name, data, callback});
            });
        });
    }

    /**
     *
     * @param {object} data
     * @param {*} data.name
     * @param {*} [data.data]
     * @param {function} data.callback
     */
    processSocketAction(data) {
        if (data.name === 'create-environment') {
            // TODO: Check if client is local.
            const envSummary = this.envManager.createEnvironment();
            data.callback(envSummary);
        }
    }

    /**
     * @param {object} socket
     * @returns {HelloResponse} Response object with basic information this client should know.
     */
    processConnection(socket) {
        // TODO: Verify that socket comes from a local address.
        return {localClient: true};
    }

    start() {
        this.httpServer.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}!`);
        });
    }

}

module.exports = Server;
