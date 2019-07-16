/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import {createReducer} from 'redux-starter-kit';

import {ActionTypes} from './Action';
import {EntityMap, ReduxHandlerMap} from './ReduxTypedef';

export const entityMapReducer = createReducer({} as EntityMap, {
    [ActionTypes.TagFiles]: (state, action) => {
        const {entities: slimEntities, tagIds} = action.payload;
        const entityMap = {...state};
        for (let i = 0; i < slimEntities.length; ++i) {
            const slimEntity = slimEntities[i];
            const oldEntity = entityMap[slimEntity.id];
            const oldTagIds = oldEntity ? oldEntity.tagIds : null;
            entityMap[slimEntity.id] = {
                ...oldEntity,
                ...slimEntity,
                tagIds: _.union(oldTagIds, tagIds),
            };
        }
        return entityMap;
    },
    [ActionTypes.UntagFiles]: (state, action) => {
        const {entityIds, tagIds} = action.payload;
        const entityMap = {...state};
        for (let i = 0; i < entityIds.length; ++i) {
            const entityId = entityIds[i];
            const entity = entityMap[entityId];
            if (!entity) return;
            entityMap[entityId] = {
                ...entity,
                tagIds: _.difference(entity.tagIds, tagIds),
            };
        }
        return entityMap;
    },

    [ActionTypes.SetAllEntities]: (state, action) => {
        const entities = action.payload;
        // Uncomment if we'll need entityIDs in the future
        const entityMap: EntityMap = {};
        for (let i = 0; i < entities.length; ++i) {
            const entity = entities[i];
            entityMap[entity.id] = entity;

            // @ts-ignore Cleaning up the object received from backend
            delete entityMap[entity.id].nixPath;
        }
        return entityMap;
    },
    [ActionTypes.UpdateEntities]: (state, action) => {
        const entities = action.payload;
        const entityMap = {...state};
        for (let i = 0; i < entities.length; ++i) {
            const entity = entities[i];
            entityMap[entity.id] = {
                ...entityMap[entity.id],
                ...entity,
            };

            // @ts-ignore Cleaning up the object received from backend
            delete entityMap[entity.id].nixPath;
        }
        return entityMap;
    },
    
    [ActionTypes.UpdateFiles]: (state, action) => {
        // Update entity info based on file changes
        const files = action.payload;
        const entityMap = {...state};
        for (const file of files) {
            if (file.entityId) {
                if (file.entityId) {
                    entityMap[file.entityId] = {
                        ...entityMap[file.entityId],
                        id: file.entityId,
                        hash: file.hash,
                        tagIds: file.tagIds,
                    };
                }
            }
        }
        return entityMap;
    },
} as ReduxHandlerMap<EntityMap>);
