/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import {createReducer} from 'redux-starter-kit';

import {ActionTypes} from './Action';
import {ReduxHandlerMap, TagMap} from './ReduxTypedef';

export const tagMapReducer = createReducer({} as TagMap, {
    [ActionTypes.SetAllTags]: (state, action) => {
        const tags = action.payload;
        const tagMap: TagMap = {};
        for (let i = 0; i < tags.length; ++i) {
            const tag = tags[i];
            tagMap[tag.id] = tag;
        }
        return tagMap;
    },
    [ActionTypes.UpdateTags]: (state, action) => {
        const tags = action.payload;
        const tagMap = {...state};
        for (let i = 0; i < tags.length; ++i) {
            const tag = tags[i];
            tagMap[tag.id] = {
                ...tagMap[tag.id],
                ...tag,
            };
        }
        return tagMap;
    },
    [ActionTypes.RemoveTags]: (state, action) => {
        const tagIds = action.payload;
        const tagMap = {...state};
        let matched = false;
        for (let i = 0; i < tagIds.length; ++i) {
            const id = tagIds[i];
            if (tagMap[id]) {
                delete tagMap[id];
                matched = true;
            }
        }
        if (!matched) return state;
        return tagMap;
    },
} as ReduxHandlerMap<TagMap>);
