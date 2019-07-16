/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import Swal from 'sweetalert2';

const ogmaSwal = Swal.mixin({
    confirmButtonClass: 'modal-button button is-danger',
    cancelButtonClass: 'modal-button button',
    buttonsStyling: false,
    animation: false,
    scrollbarPadding: false,
    reverseButtons: true,
    heightAuto: false,
    // customClass: {
    //     popup: 'animated fadeIn'
    // }
    customClass: {
        input: 'input',
    }
});

class ModalUtil {

    /**
     * @param {object} data
     * @param {string} [data.title]
     * @param {string} [data.text]
     * @param {string} [data.confirmButtonText]
     * @param {string} [data.cancelButtonText]
     */
    static confirm(data) {
        return ogmaSwal.fire({
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            ...data,
        })
            .then(result => result.value);
    }

    /**
     * @param {object} data
     * @param {string} [data.title]
     * @param {string} data.message
     * @returns {Promise<SweetAlertResult>}
     */
    static showError(data) {
        return ogmaSwal.fire({
            title: data.title || 'Error!',
            text: data.message,
            type: 'error',
            confirmButtonText: 'Cool',
        });
    }

    /**
     * @param {SweetAlertOptions} data
     * @returns {Promise<SweetAlertResult>}
     */
    static fire(data) {
        const options = {
            scrollbarPadding: false,
            ...data,
        };
        return ogmaSwal.fire(options);
    }

}

export default ModalUtil;
