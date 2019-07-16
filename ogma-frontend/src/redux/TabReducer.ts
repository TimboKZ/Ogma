/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import {createReducer} from 'redux-starter-kit';

import {ActionTypes} from './Action';
import {TabSearch, TabTags, TagOrderField} from './ReduxTypedef';
import {DefaultTagSearchCondition} from '../util/typedef';

export const tabBrowseReducer = createReducer({path: '/'}, {
    [ActionTypes.TabBrowseChangePath]: (state, action) => {
        state.path = action.payload;
    },
});

export const tabSearchReducer = createReducer<TabSearch>({
    selectedTagsMap: {},
    tagFilter: '',
    tagSearchCondition: DefaultTagSearchCondition,
}, {
    [ActionTypes.TabSearchChangeTagSelection]: (state, action) => {
        const {tagId, selected} = action.payload;
        const selectedTagsMap = {...state.selectedTagsMap};
        if (selected) selectedTagsMap[tagId] = true;
        else delete selectedTagsMap[tagId];
        return {...state, selectedTagsMap};
    },
    [ActionTypes.TabSearchChangeTagSearchCondition]: (state, action) => {
        state.tagSearchCondition = action.payload;
    },
    [ActionTypes.TabSearchChangeTagFilter]: (state, action) => {
        state.tagFilter = action.payload;
    },
});

export const tabTagsReducer = createReducer<TabTags>({
    selectedTagId: '',
    tagFilter: '',
    tagOrderField: TagOrderField.EntityCount,
}, {
    [ActionTypes.TabTagsSelectTagId]: (state, action) => {
        state.selectedTagId = action.payload;
    },
    [ActionTypes.TabTagsChangeTagOrderField]: (state, action) => {
        state.tagOrderField = action.payload;
    },
    [ActionTypes.TabTagsChangeTagFilter]: (state, action) => {
        state.tagFilter = action.payload;
    },
});
