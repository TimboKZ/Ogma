/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import c from 'classnames';
import * as PropTypes from 'prop-types';

import {connect} from 'react-redux';
import {EnvSummaryPropType} from '../../util/typedef';
import {createDeepEqualSelector} from '../../redux/Selector';
import {AppState, BaseSelector, EnvSummary, Tag} from '../../redux/ReduxTypedef';

type TagPropsConnect = {
    tag: Tag,
    tagId: string,
    showCount: boolean,
    summary: EnvSummary,
}

type TagProps = TagPropsConnect & {
    entityCount: number,
    onClick?: (tagId: string) => void,
    displayIndex: number,
    showEllipsis: boolean,
}

const badClassName = c({
    'tag-group-tag': true,
    'tag-group-tag-bad': true,
});

class TagComp extends React.Component<TagProps, {}> {

    static propTypes = {
        // Props used in redux.connect
        tagId: PropTypes.string,
        summary: EnvSummaryPropType.isRequired,
        showCount: PropTypes.bool,

        // Props provided by redux.connect
        tag: PropTypes.object.isRequired,
        entityCount: PropTypes.number,

        // Props passed by parent
        onClick: PropTypes.func,
        displayIndex: PropTypes.number,
        showEllipsis: PropTypes.bool,
    };

    static defaultProps = {
        showCount: false,
        entityCount: -1,
        displayIndex: -1,
        showEllipsis: false,
    };

    render() {
        const {tag, entityCount, onClick, displayIndex, showCount, showEllipsis} = this.props;

        if (!tag) {
            return <div key={`bad-tag-${displayIndex}`} className={badClassName}>
                <span className="tag-group-tag-name">
                Bad tag!
                </span>
            </div>;
        }

        const tagClassName = c({
            'tag-group-tag': true,
            'text-ellipsis': showEllipsis,
            'clickable': !!onClick,
        });

        const style = {background: tag.color};
        const title = showEllipsis ? tag.name : '';
        const clickFunc = onClick ? () => onClick(tag.id) : () => null;
        const HtmlTagToUse = onClick ? 'button' : 'div';
        return <HtmlTagToUse className={tagClassName} style={style} title={title} onClick={clickFunc}>
            <span className="tag-group-tag-name">{tag.name}</span>
            {showCount && <span className="tag-group-tag-count">{entityCount}</span>}
        </HtmlTagToUse>;
    };

}

const getData: BaseSelector<TagPropsConnect, { tag: Tag, entityCount: number }> = (state, props) => {
    const {summary, tagId} = props;
    const {tagMap, tagEntityMap} = state.envMap[summary.id];
    const tag = tagMap[tagId] ? tagMap[tagId] : props.tag;
    const tagIdToUse = tag ? tag.id : tagId;
    let entityCount = -2;
    if (tagEntityMap[tagIdToUse]) entityCount = tagEntityMap[tagIdToUse].length;
    return {tag, entityCount};
};
const getDataDeep = createDeepEqualSelector([getData], data => data);
export default connect((state: AppState, ownProps: any) => {
    return {...getDataDeep(state, ownProps)};
})(TagComp);

