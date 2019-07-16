/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

export default class SharedUtil {

    /**
     * @param {object} object
     * @returns {object}
     */
    static deepClone(object) {
        return JSON.parse(JSON.stringify(object));
    }

    static toHumanReadableType(value) {
        if (!value) return value;
        else if (Array.isArray(value)) return `Array(${value.length})`;
        else if (value.constructor) return value.constructor.name;
        else return typeof value;
    }

}
