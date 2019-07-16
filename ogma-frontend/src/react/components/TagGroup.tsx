/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import c from 'classnames';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';

import TagComp from './TagComp';
import {EnvSummaryPropType} from '../../util/typedef';
import {AppState, EnvSummary, Tag} from '../../redux/ReduxTypedef';

type TagGroupConnectProps = {
    entityId?: string,
    summary: EnvSummary,
    tagIds?: string[],
    nameFilter?: string,
}

type TagGroupProps = TagGroupConnectProps & {
    // Props used in redux.connect

    // Props provided by redux.connect
    tags: Tag[],
    hiddenTagCount: number,

    // Props passed by parent
    onClick: (tagId: string) => void,
    showCount: boolean,
    showEllipsis: boolean,
    showPlaceHolderOnEmpty: boolean,
}

class TagGroup extends React.Component<TagGroupProps, {}> {

    static propTypes = {
        // Props used in redux.connect
        entityId: PropTypes.string,
        summary: EnvSummaryPropType.isRequired,
        tagIds: PropTypes.arrayOf(PropTypes.string),
        nameFilter: PropTypes.string,

        // Props provided by redux.connect
        tags: PropTypes.arrayOf(PropTypes.object).isRequired,
        hiddenTagCount: PropTypes.number,

        // Props passed by parent
        onClick: PropTypes.func,
        showCount: PropTypes.bool,
        showEllipsis: PropTypes.bool,
        showPlaceHolderOnEmpty: PropTypes.bool,
    };

    static defaultProps = {
        showCount: false,
        showEllipsis: false,
        showPlaceHolderOnEmpty: false,
    };

    summary: EnvSummary;

    constructor(props: TagGroupProps) {
        super(props);
        this.summary = props.summary;
    }

    renderTags() {
        const summary = this.summary;
        const {tags, onClick, showCount, showEllipsis, showPlaceHolderOnEmpty, hiddenTagCount} = this.props;
        if (hiddenTagCount === 0 && (!tags || tags.length === 0)) {
            if (!showPlaceHolderOnEmpty) return;
            return <div className="tag-group-tag tag-group-tag-empty">
                <span className="tag-group-tag-name">
                Nothing to show
                </span>
            </div>;
        }

        const hiddenClassName = c({
            'tag-group-tag': true,
            'tag-group-tag-hidden': true,
        });

        const comps = new Array(tags.length);
        for (let i = 0; i < tags.length; ++i) {
            const tag = tags[i];
            if (tag) {
                comps[i] = <TagComp key={tag.id} summary={summary} tagId={tag.id} showCount={showCount}
                                    onClick={onClick} displayIndex={i} showEllipsis={showEllipsis}/>;
            }
        }

        if (hiddenTagCount > 0) {
            comps.push(<div key={`hidden-tag-count`} className={hiddenClassName}>
                <span className="tag-group-tag-name">
                ({hiddenTagCount} tag{hiddenTagCount !== 1 ? 's' : ''} hidden)
                </span>
            </div>);
        }

        return comps;
    }

    render() {
        return <div className="tag-group">{this.renderTags()}</div>;
    };

}

export default connect((state: AppState, ownProps: any) => {
    const {summary, tagIds, entityId, nameFilter} = ownProps as TagGroupConnectProps;
    const {tagMap, entityMap} = state.envMap[summary.id];
    let finalTagIds: string[] | null = null;
    if (tagIds) {
        finalTagIds = tagIds;
    } else if (entityId) {
        const entity = entityMap[entityId];
        if (entity) finalTagIds = entity.tagIds;
    } else {
        throw new Error('tagIds or entityId must be specified!');
    }
    let tags = finalTagIds ? finalTagIds.map(tagId => tagMap[tagId]) : null;
    let hiddenTagCount = 0;
    if (tags && nameFilter) {
        const fixedFilter = nameFilter.trim().toLowerCase();
        const oldLength = tags.length;
        tags = tags.filter(t => t.name.toLowerCase().indexOf(fixedFilter) !== -1);
        hiddenTagCount = oldLength - tags.length;
    }
    return {tags, hiddenTagCount};
})(TagGroup);
