/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import {createReducer} from 'redux-starter-kit';

import {ActionTypes} from './Action';
import {ReduxHandlerMap} from './ReduxTypedef';

export const tagIdArrayReducer = createReducer([] as string[], {
    [ActionTypes.SetAllTags]: (state, action) => {
        const tags = action.payload;
        const tagIds = new Array(tags.length);
        for (let i = 0; i < tags.length; ++i) tagIds[i] = tags[i].id;
        return tagIds;
    },
    [ActionTypes.UpdateTags]: (state, action) => {
        const tags = action.payload;
        const newTagIds = new Array(tags.length);
        for (let i = 0; i < tags.length; ++i) {
            const tag = tags[i];
            newTagIds[i] = tag.id;
        }
        return _.union(state, newTagIds);
    },
    [ActionTypes.RemoveTags]: (state, action) => {
        const tagIds = action.payload;
        const newTagIds = _.difference(state, tagIds);
        if (state.length === newTagIds.length) return state;
        return newTagIds;
    },
} as ReduxHandlerMap<string[]>);

