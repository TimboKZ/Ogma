/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const cors = require('cors');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const IpcModule = require('../../shared/IpcModule');

const Util = require('./Util');

const logger = Util.getLogger();

class Server {

    /**
     * @param {object} data
     * @param {number} data.port
     * @param {OgmaCore} data.ogmaCore
     */
    constructor(data) {
        this.port = data.port;

        this.ogmaCore = data.ogmaCore;
    }

    init() {
        this.expressApp = express();
        this.expressApp.use(cors());

        this.httpServer = http.Server(this.expressApp);
        this.socketIO = socketIO(this.httpServer);
        this.ipcModule = new IpcModule({socket: this.socketIO, logger, ogmaCore: this.ogmaCore});
    }

    start() {
        return new Promise(resolve => {
            this.httpServer.listen(this.port, () => {
                logger.info(`Server listening on port ${this.port}!`);
                resolve();
            });
        });
    }

}

module.exports = Server;
