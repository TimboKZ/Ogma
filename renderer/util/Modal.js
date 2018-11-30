/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const swal = require('sweetalert2');
const Promise = require('bluebird');

const ogmaSwal = swal.mixin({
    confirmButtonClass: 'modal-button button is-danger',
    cancelButtonClass: 'modal-button button',
    buttonsStyling: false,
    animation: false,
});

class Modal {

    /**
     * @param {object} data
     * @param {string} [data.title]
     * @param {string} [data.text]
     * @param {string} [data.confirmButtonText]
     * @param {string} [data.cancelButtonText]
     */
    static confirm(data) {
        return ogmaSwal({
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            ...data,
        });
    }

    /**
     * @param {object} data
     * @param {string} [data.title]
     * @param {string} [data.text]
     * @param {function} [data.onOpen]
     */
    static showButtonless(data) {
        return new Promise((resolve) => {
            ogmaSwal({
                showConfirmButton: false,
                allowOutsideClick: false,
                showCancelButton: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                onOpen: () => resolve(),
                ...data,
            });
        });
    }

    static hide() {
        ogmaSwal.close();
    }

}

module.exports = Modal;
