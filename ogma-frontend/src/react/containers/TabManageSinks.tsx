/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import {Helmet} from 'react-helmet';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import {Else, If, Then} from 'react-if';
import ReactTags from 'react-tag-autocomplete';

import Util from '../../util/Util';
import Icon from '../components/Icon';
import SinkTree from '../../util/SinkTree';
import SinkViz from '../components/SinkViz';
import {EnvSummaryPropType} from '../../util/typedef';
import {AppState, EnvSummary, Sink, TagMap} from '../../redux/ReduxTypedef';
import {createShallowEqualObjectSelector, Selector} from '../../redux/Selector';

type TabManageSinksProps = {
    // Props used in redux.connect
    summary: EnvSummary,

    // Props provided by redux.connect
    tags: any[],
    tagMap: TagMap,
    sinkTree: any,
}

type TabManageSinksState = {
    tags: any[],
    nixPath?: string,
}

class TabManageSinks extends React.Component<TabManageSinksProps, TabManageSinksState> {

    static propTypes = {
        // Props used in redux.connect
        summary: EnvSummaryPropType.isRequired,

        // Props provided by redux.connect
        tags: PropTypes.array.isRequired,
        tagMap: PropTypes.object.isRequired,
        sinkTree: PropTypes.array.isRequired,
    };

    sinkTree: any;

    constructor(props: TabManageSinksProps) {
        super(props);
        this.state = {
            tags: [],
        };
        this.sinkTree = new SinkTree();
        this.sinkTree.loadSnapshot(props.sinkTree);
    }

    componentDidUpdate(prevProps: Readonly<TabManageSinksProps>, prevState: Readonly<TabManageSinksState>): void {
        const {sinkTree} = this.props;

        if (!Util.shallowEqual(sinkTree, prevProps.sinkTree)) {
            this.sinkTree.loadSnapshot(sinkTree);
        }
    }

    handleDelete(i: number) {
        const tags = this.state.tags.slice(0);
        tags.splice(i, 1);
        const tagIds = tags.map(t => t.id);
        const sink = this.sinkTree.findBestSink(tagIds);
        this.setState({tags, nixPath: sink ? sink.nixPath : undefined});
    }

    handleAddition(tag: any) {
        const tags = this.state.tags.concat([tag]);
        const tagIds = tags.map(t => t.id);
        const sink = this.sinkTree.findBestSink(tagIds);
        this.setState({tags, nixPath: sink ? sink.nixPath : undefined});
    }

    render() {
        const {summary, tags, sinkTree} = this.props;
        const {nixPath} = this.state;
        return <div className="env-manage-sinks">
            <Helmet><title>Sinks</title></Helmet>
            <div className="box">
                <Icon name="info-circle"/>&nbsp;
                Files with tags
                <div className="env-manage-sinks-tags">
                    <ReactTags
                        allowNew={false}
                        suggestions={tags}
                        tags={this.state.tags}
                        placeholder="Specify tags"
                        handleDelete={this.handleDelete.bind(this)}
                        handleAddition={this.handleAddition.bind(this)}/>
                </div>
                will get sent into sink:&nbsp;&nbsp;
                <If condition={!!nixPath}>
                    <Then>
                        <code className="env-manage-sinks-sink">{nixPath}</code>
                    </Then>
                    <Else>
                        <code className="env-manage-sinks-sink has-text-grey is-italic">None</code>
                    </Else>
                </If>
            </div>

            <SinkViz summary={summary} sinks={sinkTree} topLevel={true}/>
        </div>;
    };

}

const getShallowTagMap = createShallowEqualObjectSelector(Selector.getTagMap, data => data);

export default connect((state: AppState, ownProps: any) => {
    const {sinkTree} = state.envMap[ownProps.summary.id];
    return {
        tags: Selector.getAllTags(state, ownProps),
        tagMap: getShallowTagMap(state, ownProps),
        sinkTree,
    };
})(TabManageSinks);
