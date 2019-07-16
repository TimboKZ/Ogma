/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

import React from 'react';
import c from 'classnames';
import {When} from 'react-if';
import PropTypes from 'prop-types';

import Icon from './Icon';
import TagGroup from './TagGroup';
import {EnvSummaryPropType} from '../../util/typedef';
import {EnvSummary, Sink} from '../../redux/ReduxTypedef';

type SinkVizProps = {
    summary: EnvSummary,
    sinks: Sink[],
    topLevel: boolean,
    parentPath: string,
}

type SinkVizState = {}

export default class SinkViz extends React.Component<SinkVizProps, SinkVizState> {

    static propTypes = {
        summary: EnvSummaryPropType,
        sinks: PropTypes.array.isRequired,
        topLevel: PropTypes.bool,
        parentPath: PropTypes.string,
    };

    static defaultProps = {
        topLevel: false,
        parentPath: '',
    };

    renderSinks() {
        const {summary, sinks, topLevel, parentPath} = this.props;

        const className = c({
            'sink-viz-sink': true,
            'sink-viz-sink-top': topLevel,
        });

        const sinkComps = new Array(sinks.length);
        for (let i = 0; i < sinks.length; ++i) {
            const sink = sinks[i];
            sinkComps[i] = <div key={sink.sinkId} className={className}>
                <div className="sink-viz-sink-name">
                    <Icon name="folder"/>
                    {sink.nixPath.substring(parentPath.length)}
                    <TagGroup summary={summary} tagIds={Object.keys(sink.tagMap)}/>
                </div>
                <When condition={!!sink.sinks && sink.sinks.length > 0}>
                    <div className="sink-viz-sink-children">
                        <SinkViz summary={summary} sinks={sink.sinks} parentPath={sink.nixPath}/>
                    </div>
                </When>
            </div>;
        }
        return sinkComps;
    }

    render() {
        return <div className="sink-viz">
            {this.renderSinks()}
        </div>;
    };

}