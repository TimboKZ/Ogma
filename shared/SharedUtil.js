/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

class SharedUtil {

    static toHumanReadableType(value) {
        if (!value) return value;
        else if (Array.isArray(value)) return `Array(${value.length})`;
        else if (value.constructor) return value.constructor.name;
        else return typeof value;
    }

}

module.exports = SharedUtil;
