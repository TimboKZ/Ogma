/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import {Set} from 'core-js';
import reduceReducers from 'reduce-reducers';
import {combineReducers, Reducer} from 'redux';

import Util from '../util/Util';
import {ActionTypes} from './Action';
import SharedUtil from '../util/SharedUtil';
import {tagMapReducer} from './TagMapReducer';
import {fileMapReducer} from './FileMapReducer';
import {entityMapReducer} from './EntityMapReducer';
import {createSimpleReducer} from './SimpleReducer';
import {DefaultEnvRoutePath} from '../util/typedef';
import {tagIdArrayReducer} from './TagIdArrayReducer';
import {tagEntityMapReducer} from './TagEntityMapReducer';
import {EnvState, EnvSummary, ReduxAction, Sink} from './ReduxTypedef';
import {tabBrowseReducer, tabSearchReducer, tabTagsReducer} from './TabReducer';

const jsondiffpatch = require('jsondiffpatch');

const summaryReducer: Reducer<EnvSummary, ReduxAction> = (state = {} as EnvSummary, action) => {
    if (action.type !== ActionTypes.UpdateSummary) return state;
    return action.payload;
};

const subRouteReducer: Reducer<string, ReduxAction> = (state = DefaultEnvRoutePath, action) => {
    if (action.type !== ActionTypes.UpdateSubRoute) return state;
    return action.payload;
};

const sinkTreeReducer: Reducer<Sink[], ReduxAction> = (state = [], action) => {
    if (action.type === ActionTypes.SetSinkTree) return action.payload;
    else if (action.type === ActionTypes.ApplySinkTreeDiff) {
        const clone = SharedUtil.deepClone(state);
        jsondiffpatch.patch(clone, action.payload);
        return clone;
    }
    return state;
};

export const envMiscReducer = createSimpleReducer<EnvState>({} as EnvState, {
    [ActionTypes.UpdateEntities]: (state, action) => {
        const entities = action.payload;
        for (const entity of entities) {
            if (entity.tagIds) {
                throw new Error(`Redux action ${ActionTypes.UpdateEntities} is updating entity tag IDs`
                    + ` - this is not allowed!`);
            }
        }
        return state;
    },
    [ActionTypes.RemoveEntities]: (state, action) => {
        const entityIds = action.payload;
        let {entityMap, tagEntityMap, fileMap} = state;
        let fileMapCloned = false;

        const seenTagMap: { [tagId: string]: Set<string> } = {};

        // Update entityMap and fileMap
        entityMap = {...entityMap};
        for (let i = 0; i < entityIds.length; ++i) {
            const entityId = entityIds[i];
            const entity = entityMap[entityId];
            delete entityMap[entityId];
            if (entity) {
                // If entity has tags, populate `seenTagMap`
                if (entity.tagIds && entity.tagIds.length !== 0) {
                    for (const tagId of entity.tagIds) {
                        if (!seenTagMap[tagId]) seenTagMap[tagId] = new Set();
                        seenTagMap[tagId].add(entityId);
                    }
                }

                // If relevant file exists, update its `entityId` field.
                if (fileMap[entity.hash]) {
                    if (!fileMapCloned) {
                        fileMap = {...fileMap};
                        fileMapCloned = true;
                    }
                    fileMap[entity.hash] = {
                        ...fileMap[entity.hash],
                        entityId: undefined,
                    };
                }
            }
        }

        // Remove entities from relevant tags in `tagEntityMap`.
        tagEntityMap = {...tagEntityMap};
        for (const tagId in seenTagMap) {
            if (!tagEntityMap[tagId]) continue;
            const oldEntityIds = tagEntityMap[tagId];
            const entityIdsToRemove = Array.from(seenTagMap[tagId]);
            entityIdsToRemove.sort();
            tagEntityMap[tagId] = Util.removeSorted(oldEntityIds, entityIdsToRemove);
        }

        return {...state, entityMap, tagEntityMap, fileMap};
    },
    [ActionTypes.RemoveFiles]: (state, action) => {
        // Delete entity when file is deleted
        const deletedHashes = action.payload;
        let {entityMap, fileMap} = state;
        entityMap = {...entityMap};
        for (const fileHash of deletedHashes) {
            const file = fileMap[fileHash];
            if (!file) continue;
            if (file.entityId) delete entityMap[file.entityId];
        }
        return {...state, entityMap};
    },
});

const envNewReducer = combineReducers<EnvState>({
    summary: summaryReducer,
    subRoute: subRouteReducer,
    tagIds: tagIdArrayReducer,
    tagMap: tagMapReducer,
    entityMap: entityMapReducer,
    tagEntityMap: tagEntityMapReducer,
    fileMap: fileMapReducer,
    sinkTree: sinkTreeReducer,
    tabBrowse: tabBrowseReducer,
    tabSearch: tabSearchReducer,
    tabTags: tabTagsReducer,
});

export const envBaseReducer = reduceReducers<EnvState>(envNewReducer, envMiscReducer);
