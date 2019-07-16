/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import {createReducer} from 'redux-starter-kit';

import Util from '../util/Util';
import {ActionTypes} from './Action';

export const fileMapReducer = createReducer({}, {
    [ActionTypes.TagFiles]: (state, action) => {
        const {entities: slimEntities} = action.payload;
        const fileMap = {...state};
        for (let i = 0; i < slimEntities.length; ++i) {
            const slimEntity = slimEntities[i];
            const oldFile = fileMap[slimEntity.hash];
            if (!oldFile) continue;
            fileMap[slimEntity.hash] = {
                ...oldFile,
                entityId: slimEntity.id,
            };
        }
        return fileMap;
    },

    [ActionTypes.UpdateDirectory]: (state, action) => {
        const {dirFile, fileHashes} = action.payload;
        const fileMap = {...state};
        const oldDir = fileMap[dirFile.hash];
        fileMap[dirFile.hash] = {
            ...oldDir,
            ...dirFile,
            dirReadTime: dirFile.readTime,
        };
        if (fileHashes) fileMap[dirFile.hash].fileHashes = fileHashes;
        return fileMap;
    },
    [ActionTypes.UpdateFiles]: (state, action) => {
        const files = action.payload;
        const fileMap = {...state};
        const dirHashMap = {};
        for (const file of files) {
            const oldFile = fileMap[file.hash];
            fileMap[file.hash] = {
                ...oldFile,
                ...file,
            };

            // Delete tag IDs from file since this data belongs in entity map
            delete fileMap[file.hash]['tagIds'];

            // Record for which directories new files are created
            if (!oldFile) {
                const nixPath = file.nixPath;
                const dirPath = nixPath.substring(0, nixPath.length - file.base.length - 1);
                const dirHash = Util.getFileHash(dirPath === '' ? '/' : dirPath);
                if (dirHashMap[dirHash]) dirHashMap[dirHash].push(file.hash);
                else dirHashMap[dirHash] = [file.hash];
            }
        }

        // Update list of child hashes for relevant directories
        for (const dirHash in dirHashMap) {
            if (!dirHashMap.hasOwnProperty(dirHash)) continue;
            const directory = fileMap[dirHash];
            if (!directory) continue;
            const fileHashes = directory.fileHashes;
            if (!fileHashes) continue;

            fileMap[dirHash] = {
                ...directory,
                fileHashes: _.union(fileHashes, dirHashMap[dirHash]),
            };
        }

        return fileMap;
    },
    [ActionTypes.RemoveFiles]: (state, action) => {
        const deletedHashes = action.payload;
        const fileMap = {...state};

        const dirHashMap = {};
        for (const fileHash of deletedHashes) {
            const file = fileMap[fileHash];
            if (file) {
                const nixPath = file.nixPath;
                const dirPath = nixPath.substring(0, nixPath.length - file.base.length - 1);
                const dirHash = Util.getFileHash(dirPath === '' ? '/' : dirPath);

                if (dirHashMap[dirHash]) dirHashMap[dirHash].push(fileHash);
                else dirHashMap[dirHash] = [fileHash];
            }
            delete fileMap[fileHash];
        }

        for (const dirHash in dirHashMap) {
            if (!dirHashMap.hasOwnProperty(dirHash)) continue;
            const directory = fileMap[dirHash];
            if (!directory) continue;
            const fileHashes = directory.fileHashes;
            if (!fileHashes) continue;

            fileMap[dirHash] = {
                ...directory,
                fileHashes: _.difference(fileHashes, dirHashMap[dirHash]),
            };
        }

        return fileMap;
    },
    [ActionTypes.UpdateThumbStates]: (state, action) => {
        const {thumbs, thumbState} = action.payload;
        const fileMap = {...state};

        for (const thumb of thumbs) {
            const {hash, thumbName} = thumb;
            const file = fileMap[hash];
            if (file) fileMap[hash] = {...file, thumbName, thumbState};
        }
        return fileMap;
    },
});
