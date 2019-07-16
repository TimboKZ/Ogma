/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import Promise from 'bluebird';

import ModalUtil from './ModalUtil';

export class UserFriendlyError extends Error {

    /**
     * @param {object} data
     * @param {string} [data.title]
     * @param {string} data.message
     * @param {*} [data.data]
     */
    constructor(data) {
        super();
        this.title = data.title;
        this.message = data.message;
        this.data = data.data;
    }

    toString() {
        const titlePart = this.title ? `Error (${this.title})` : `Error`;
        const dataPart = this.data === undefined ? '' : `(${JSON.stringify(this.data)})`;
        return `${titlePart}: ${this.message} ${dataPart}`;
    }

}

export default class ErrorHandler {

    /**
     * Notifies the user about the error and logs it
     * @param error
     */
    static handleMiscError(error) {
        const errorData = {
            title: error.title, // Available if given UserFriendlyError instance
            message: error.message,
        };

        const modalPromise = ModalUtil.showError(errorData);
        const logPromise = ErrorHandler.handleMiscErrorQuiet(error);
        return Promise.all([modalPromise, logPromise]);
    }

    /**
     * Logs an error to the console and performs other necessary actions
     * @param {Error} error
     */
    static handleMiscErrorQuiet(error) {
        return Promise.resolve()
            .then(() => console.error(error));
    }

}
