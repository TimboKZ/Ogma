/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import {Reducer} from 'redux';
import {ReduxAction, ReduxHandlerMap} from './ReduxTypedef';

export const DefaultReducerFunction: string = '__default';

export function createSimpleReducer<S>(initialState: S, handlers: ReduxHandlerMap<S>): Reducer<S, ReduxAction> {
    return (state = initialState, action) => {
        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](state, action);
        } else if (handlers.hasOwnProperty(DefaultReducerFunction)) {
            return handlers[DefaultReducerFunction](state, action);
        } else {
            return state;
        }
    };
}
