/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

class ErrorHandler {

    constructor() {
        this.handle = this.handle.bind(this);
    }


    /**
     * @param {object|Error} input
     */
    handle(input) {
        let data = {};
        if (input instanceof Error) {
            data.error = input;
        } else {
            data = input;
        }

        console.log(data.error);
    }

}

module.exports = ErrorHandler;
