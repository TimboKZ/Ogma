/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import SharedUtil from './SharedUtil';

export default class SinkTree {
    /**
     * @typedef {object} SinkTreeNode
     * @property {object} tagMap
     * @property {string} sinkId
     * @property {string} nixPath
     * @property {SinkTreeNode[]} sinks
     */

    /**
     * @typedef {object} SinkTreeInput
     * @property {object} id
     * @property {string} nixPath
     * @property {string[]} tagIds
     */

    constructor() {
        this.fsTree = {
            tagIds: [],
            children: {},
        };
        this.rootSinks = [];
    }

    /**
     * @param {SinkTreeInput} sink
     */
    _overwriteSink(sink) {
        const {id, nixPath, tagIds} = sink;
        if (nixPath === '/') return;

        const parts = nixPath.substring(1).split('/');
        if (parts.length === 0) return;

        // Update the FS tree
        let prevLevel = this.fsTree;
        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            const lastPart = i === parts.length - 1;
            let level = prevLevel.children[part];
            if (!level) {
                level = {
                    tagIds: [],
                    children: {},
                };
                prevLevel.children[part] = level;
            }
            if (lastPart) {
                // We overwrite all details since there can only be 1 sink per (unique) path
                level.sinkId = id;
                level.nixPath = nixPath;
                level.tagIds = tagIds;
            }
            prevLevel = level;
        }
    }

    _rebuildSinkTree() {
        // Update sink tree
        const parseRoot = root => {
            const childDirs = Object.keys(root.children);
            let sinks = [];
            for (const dirName of childDirs) {
                const child = root.children[dirName];
                const childSinks = parseRoot(child);
                if (child.tagIds && child.tagIds.length > 0) {
                    const tagMap = {};
                    for (const tagId of child.tagIds) tagMap[tagId] = true;
                    sinks.push({
                        tagMap,
                        sinkId: child.sinkId,
                        nixPath: child.nixPath,
                        sinks: childSinks,
                    });
                } else {
                    sinks = sinks.concat(childSinks);
                }
            }
            return sinks;
        };
        this.rootSinks = parseRoot(this.fsTree);
    }

    /**
     * @param {SinkTreeInput[]} sinks
     */
    overwriteSinks(sinks) {
        for (const sink of sinks) this._overwriteSink(sink);
        this._rebuildSinkTree();
    }

    /**
     * @param {SinkTreeNode[]} sinks
     * @param {string[]} tagIds
     * @param {number} depth
     * @returns {SinkTreeNode|null}
     * @private
     */
    _getDeepestSink(sinks, tagIds, depth) {
        let bestDepth = 0;
        let bestSink = null;
        for (const sink of sinks) {
            const tagMap = sink.tagMap;
            let matchedTag = false;
            if (tagMap) {
                for (const tagId of tagIds) {
                    if (tagMap[tagId]) {
                        matchedTag = true;
                        break;
                    }
                }
            }
            if (!matchedTag) continue;
            bestDepth = depth;
            bestSink = {nixPath: sink.nixPath, depth};
            const childSink = this._getDeepestSink(sink.sinks, tagIds, depth + 1);
            if (!childSink) continue;
            if (childSink.depth > bestDepth) {
                bestDepth = childSink.depth;
                bestSink = childSink;
            }
        }
        return bestSink;
    };

    /**
     * @param {string[]} tagIds
     * @returns {SinkTreeNode|null}
     */
    findBestSink(tagIds) {
        return this._getDeepestSink(this.rootSinks, tagIds, 1);
    }

    getSnapshot() {
        return SharedUtil.deepClone(this.rootSinks);
    }

    loadSnapshot(rootSinks) {
        this.rootSinks = rootSinks;
    }

}
