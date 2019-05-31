/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

class ExactTrie {

    /**
     * @param {object} data
     * @param {boolean} [data.ignoreCase]
     */
    constructor(data = {}) {
        this.trie = {};
        this.ignoreCase = data.ignoreCase !== undefined ? data.ignoreCase : true;
    }

    /**
     * @param {string} key
     * @param {*} value
     * @param {boolean} reverse
     */
    put(key, value, reverse = false) {
        if (this.ignoreCase) key = key.toLowerCase();

        let curr = this.trie;

        if (reverse) {
            for (let i = key.length - 1; i >= 0; --i) {
                const char = key.charAt(i);
                if (!curr[char]) curr[char] = {};
                curr = curr[char];
            }
        } else {
            for (let i = 0; i < key.length; ++i) {
                const char = key.charAt(i);
                if (!curr[char]) curr[char] = {};
                curr = curr[char];
            }
        }

        curr['__'] = value;
    }

    /**
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        if (this.ignoreCase) key = key.toLowerCase();

        let curr = this.trie;
        for (let i = 0; i < key.length; i++) {
            const char = key.charAt(i);
            let next = curr[char];
            if (!next) return false;
            curr = next;
        }
        return curr['__'];
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        if (this.ignoreCase) key = key.toLowerCase();

        let curr = this.trie;
        for (let i = 0; i < key.length; i++) {
            const char = key.charAt(i);
            let next = curr[char];
            if (!next) return false;
            curr = next;
        }
        return curr['__'] !== undefined;
    }

    /**
     * @param {string} key
     * @param {string} checkpointChar
     * @param {boolean} reverse
     * @returns {*}
     */
    getWithCheckpoints(key, checkpointChar, reverse = false) {
        if (this.ignoreCase) key = key.toLowerCase();

        let candidate = undefined;
        let curr = this.trie;

        if (reverse) {
            for (let i = key.length - 1; i >= 0; --i) {
                const char = key.charAt(i);
                let next = curr[char];
                if (!next) break;
                if (char === checkpointChar) {
                    const val = curr['__'];
                    if (val) candidate = val;
                }
                curr = next;
            }
        } else {
            for (let i = 0; i < key.length; ++i) {
                const char = key.charAt(i);
                let next = curr[char];
                if (!next) break;
                if (char === checkpointChar) {
                    const val = curr['__'];
                    if (val) candidate = val;
                }
                curr = next;
            }
        }

        const val = curr['__'];
        if (val) candidate = val;

        return candidate;
    }

}

module.exports = ExactTrie;
