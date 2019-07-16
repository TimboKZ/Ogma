/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import deepEqual from 'fast-deep-equal';
import {createSelector, createSelectorCreator, defaultMemoize, ParametricSelector} from 'reselect';

import Util from '../util/Util';
import {AppState, EnvSummary, Tag, TagMap} from './ReduxTypedef';

export const createDeepEqualSelector = createSelectorCreator(
    defaultMemoize,
    deepEqual,
);

export const createShallowEqualObjectSelector = createSelectorCreator(
    defaultMemoize,
    Util.shallowEqual,
);

type WithSummary = {
    summary: EnvSummary;
}

export type BaseSelector<P, R> = ParametricSelector<AppState, P, R>;

export class Selector {

    static getTagIds: BaseSelector<WithSummary, string[]> = (state, props) => state.envMap[props.summary.id].tagIds;
    static getTagMap: BaseSelector<WithSummary, TagMap> = (state, props) => state.envMap[props.summary.id].tagMap;
    static getAllTags = createSelector<AppState, WithSummary, string[], TagMap, Tag[]>(
        [Selector.getTagIds, Selector.getTagMap],
        (tagIds, tagMap) => tagIds.map(tagId => tagMap[tagId]),
    );

}
