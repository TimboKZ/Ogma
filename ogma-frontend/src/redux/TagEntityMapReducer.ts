/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import Denque from 'denque';

import Util from '../util/Util';
import {ActionTypes} from './Action';
import {createSimpleReducer} from './SimpleReducer';
import {Entity, TagEntityMap} from './ReduxTypedef';

export const tagEntityMapReducer = createSimpleReducer<TagEntityMap>({}, {
    [ActionTypes.SetAllTags]: (state, action) => {
        const tags = action.payload;
        const tagEntityMap: TagEntityMap = {};
        for (const tag of tags) tagEntityMap[tag.id] = [];
        return tagEntityMap;
    },
    [ActionTypes.UpdateTags]: (state, action) => {
        const tags = action.payload;
        const tagEntityMap = {...state};
        let matched = false;
        for (const tag of tags) {
            if (!tagEntityMap[tag.id]) {
                tagEntityMap[tag.id] = [];
                matched = true;
            }
        }
        if (!matched) return state;
        return tagEntityMap;
    },
    [ActionTypes.RemoveTags]: (state, action) => {
        const tags = action.payload;
        const tagEntityMap = {...state};
        let matched = false;
        for (const tag of tags) {
            if (!tagEntityMap[tag.id]) {
                delete tagEntityMap[tag.id];
                matched = true;
            }
        }
        if (!matched) return state;
        return tagEntityMap;
    },
    [ActionTypes.TagFiles]: (state, action) => {
        const {entities, tagIds} = action.payload;
        const tagEntityMap = {...state};
        const entityIds = entities.map((e: Entity) => e.id);
        entityIds.sort();
        for (const tagId of tagIds) {
            const oldEntityIds = tagEntityMap[tagId];
            const newEntityIds = Util.unionSorted(oldEntityIds, entityIds);
            if (newEntityIds !== oldEntityIds) {
                tagEntityMap[tagId] = newEntityIds;
            }
        }
        return tagEntityMap;
    },
    [ActionTypes.UntagFiles]: (state, action) => {
        const {entityIds, tagIds} = action.payload;
        const tagEntityMap = {...state};
        entityIds.sort();
        for (const tagId of tagIds) {
            const oldEntityIds = tagEntityMap[tagId];
            const newEntityIds = Util.removeSorted(oldEntityIds, entityIds);
            if (newEntityIds !== oldEntityIds) {
                tagEntityMap[tagId] = newEntityIds;
            }
        }
        return tagEntityMap;
    },

    [ActionTypes.SetAllEntities]: (state, action) => {
        const entities = action.payload;
        const prelimMap: { [tagId: string]: Denque } = {};
        for (const entity of entities) {
            for (const tagId of entity.tagIds) {
                if (!prelimMap[tagId]) {
                    prelimMap[tagId] = new Denque();
                }
                prelimMap[tagId].push(entity.id);
            }
        }
        const tagEntityMap = {...state};
        for (const tagId in prelimMap) {
            tagEntityMap[tagId] = prelimMap[tagId].toArray().sort();
        }
        return tagEntityMap;
    },
});
