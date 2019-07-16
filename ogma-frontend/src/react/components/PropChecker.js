/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';

import Util from '../../util/Util';

/**
 * @param {React.Component} WrappedComponent
 * @param {function(props: string): string} [getId]
 */
export default function withPropChecker(WrappedComponent, getId = null) {
    let counter = 1;
    return class PropsChecker extends React.Component {
        componentDidUpdate(prevProps, prevState, snapshot) {
            let id = '[...]';
            if (getId) id = `[${getId(this.props)} ${counter++}]`;
            const shallowKeys = Util.getShallowDiffKeys(prevProps, this.props);
            const deepKeys = Util.getDeepDiffKeys(prevProps, this.props);
            
            const shallowChangeMap = {};
            shallowKeys.map(k => shallowChangeMap[k] = Util.getShallowDiffKeys(prevProps[k], this.props[k]))

            console.log(id, 'Shallow changes:', shallowChangeMap);
            console.log(id, 'Deep changes:', deepKeys);
            Util.printDeepObjectDiffs(prevProps, this.props, id, deepKeys);
        }

        render() {
            return <WrappedComponent {...this.props} />;
        }
    };
}
