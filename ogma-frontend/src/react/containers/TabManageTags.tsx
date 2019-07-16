/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import {Helmet} from 'react-helmet';
import React, {FormEvent} from 'react';
import * as PropTypes from 'prop-types';
import {SliderPicker} from 'react-color';
import {connect} from 'react-redux';

import Util from '../../util/Util';
import Icon from '../components/Icon';
import Tabs from '../components/Tabs';
import TagComp from '../components/TagComp';
import ModalUtil from '../../util/ModalUtil';
import TagGroup from '../components/TagGroup';
import {TabTagsDispatcher} from '../../redux/Action';
import {EnvSummaryPropType} from '../../util/typedef';
import {createShallowEqualObjectSelector} from '../../redux/Selector';
import {
    AppState,
    BaseSelector,
    EnvSummary,
    TabTags,
    Tag,
    TagFieldNames,
    TagMap,
    TagOrderField,
} from '../../redux/ReduxTypedef';
import {createSelector} from 'reselect';

const SearchConditionOptions = [
    {id: TagOrderField.EntityCount, name: 'File count'},
    {id: TagOrderField.Name, name: 'Name'},
    {id: TagOrderField.Color, name: 'Color'},
];

type TabManageTagsProps = TabTags & {
    // Props used in redux.connect
    summary: EnvSummary,

    // Props provided by redux.connect
    tagIds: string[],
    tagMap: TagMap,
}

type TabManageTagsState = {
    tagFilter: string,
    selectedTag?: Tag,
    hasUnsavedChanges: boolean,
}

class TabManageTags extends React.Component<TabManageTagsProps, TabManageTagsState> {

    static propTypes = {
        // Props used in redux.connect
        summary: EnvSummaryPropType.isRequired,

        // Props provided by redux.connect
        tagIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        tagMap: PropTypes.object.isRequired,
    };

    summary: EnvSummary;
    debouncedChangesCheck: (selectedTag?: Tag) => void;
    debouncedTagFilterDispatch: (tagFilter: string) => void;

    constructor(props: TabManageTagsProps) {
        super(props);
        this.summary = props.summary;
        this.state = {
            tagFilter: '',
            selectedTag: undefined,
            hasUnsavedChanges: false,
        };

        this.debouncedChangesCheck = _.debounce(selectedTag => {
            const {tagMap} = this.props;
            let hasUnsavedChanges = false;
            if (selectedTag) {
                const actualTag = tagMap[selectedTag.id];
                hasUnsavedChanges = !Util.deepEqual(selectedTag, actualTag);
            }
            this.setState({hasUnsavedChanges});
        }, 50);
        this.debouncedTagFilterDispatch = _.debounce(tagFilter =>
            TabTagsDispatcher.changeTagFilter(this.summary.id, tagFilter), 100);
    }

    componentDidUpdate(prevProps: Readonly<TabManageTagsProps>, prevState: Readonly<TabManageTagsState>): void {
        const {tagMap} = this.props;
        const {selectedTag} = this.state;
        if (prevState.selectedTag !== selectedTag || prevProps.tagMap !== tagMap) {
            this.debouncedChangesCheck(selectedTag);
        }
    }

    selectTag = (tagId: string) => {
        const {tagMap} = this.props;
        this.setState({selectedTag: tagMap[tagId]});
    };

    saveTag = (event: FormEvent) => {
        const summary = this.summary;
        const {selectedTag: tag} = this.state;
        event.preventDefault();
        if (!tag) return;
        window.ipcModule.updateTag({id: summary.id, tag});
    };

    removeTag = (event: FormEvent) => {
        const summary = this.summary;
        const {tagMap} = this.props;
        const {selectedTag: tag} = this.state;
        event.preventDefault();
        if (!tag) return;

        const actualTag = tagMap[tag.id];
        ModalUtil.confirm({
            title: `Delete tag "${actualTag.name}"?`,
            text: `This tag will be removed from all files and deleted permanently.`,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No, cancel',
        })
            .then(result => {
                if (!result) return;
                return window.ipcModule.removeTag({id: summary.id, tagId: tag.id})
                    .then(() => this.setState({selectedTag: undefined}));
            })
            .catch(window.handleError);
    };

    updateTagField = (fieldName: TagFieldNames, value: string) => {
        this.setState(prevState => {
            const {selectedTag: tag} = prevState;
            if (tag) {
                const selectedTag = {...tag} as Tag;
                selectedTag[fieldName] = value;
                return {selectedTag};
            }
            return {};
        });
    };

    handleTagFilterChange = (tagFilter: string) => {
        this.setState({tagFilter});
        this.debouncedTagFilterDispatch(tagFilter);
    };

    handleTagOrderFieldChange = (tagOrderField: TagOrderField) =>
        TabTagsDispatcher.changeTagOrderField(this.summary.id, tagOrderField);

    renderTagForm() {
        const summary = this.summary;
        const {selectedTag: tag, hasUnsavedChanges} = this.state;

        if (!tag) return <div>Select a tag from the list on the right.</div>;

        return <React.Fragment>
            <form onSubmit={this.saveTag}>
                <div className="field">
                    <label className="label">
                        Preview
                        <span style={{fontWeight: 'normal'}}>&nbsp;{hasUnsavedChanges ? '(unsaved)' : ''}</span>
                    </label>
                    <TagComp summary={summary} tag={tag} showCount={true}/>
                </div>
                <div className="field">
                    <label className="label">Name</label>
                    <div className="control">
                        <input className="input" type="text" value={tag.name} placeholder="Tag name"
                               onChange={event => this.updateTagField(TagFieldNames.Name, event.target.value)}/>
                    </div>
                </div>
                <div className="field">
                    <label className="label">Color</label>
                    <SliderPicker color={tag.color}
                                  onChange={(color: any) => this.updateTagField(TagFieldNames.Color, color.hex)}/>
                </div>
            </form>

            <br/>

            <div className="columns">
                <div className="column">
                    <button className="button is-fullwidth is-info" onClick={this.saveTag} disabled={!tag.name}>
                        Save
                    </button>
                </div>
                <div className="column">
                    <button className="button is-fullwidth is-danger" onClick={this.removeTag}>
                        Delete
                    </button>
                </div>
            </div>
        </React.Fragment>;
    }

    render() {
        const {tagIds, tagFilter: propTagFilter, tagOrderField} = this.props;
        const {tagFilter} = this.state;

        return <React.Fragment>
            <Helmet><title>Tags</title></Helmet>
            <div className="columns env-manage-tags">
                <div className="column is-narrow" style={{width: 300}}>
                    <div className="box">{this.renderTagForm()}</div>
                </div>
                <div className="column">
                    <div className="level">
                        <div className="level-left">
                            <div className="level-item">
                                <div className="field has-addons">
                                    <p className="control">
                                        <button className="button is-static"><Icon name="search"/></button>
                                    </p>
                                    <p className="control is-expanded">
                                        <input className="input" type="text" placeholder="Search tags" value={tagFilter}
                                               onChange={event => this.handleTagFilterChange(event.target.value)}/>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="level-right">
                            <div className="level-item">
                                Order tags by
                                <Tabs options={SearchConditionOptions} className="is-toggle"
                                      activeOption={tagOrderField}
                                      onOptionChange={this.handleTagOrderFieldChange}/>
                            </div>
                        </div>
                    </div>
                    <TagGroup summary={this.summary} tagIds={tagIds} onClick={this.selectTag}
                              nameFilter={propTagFilter} showCount={true}/>
                </div>
            </div>
        </React.Fragment>;
    };

}

const getTagMap: BaseSelector<any, TagMap> = (state, props) => state.envMap[props.summary.id].tagMap;
const getShallowTagMap = createShallowEqualObjectSelector(getTagMap, data => data);
const getTagEntityCount: BaseSelector<any, { [tagId: string]: number }> = (state, props) => {
    const tagEntityMap = state.envMap[props.summary.id].tagEntityMap;
    const tagEntityCount: { [tagId: string]: number } = {};
    for (const tagId in tagEntityMap) {
        tagEntityCount[tagId] = tagEntityMap[tagId].length;
    }
    return tagEntityCount;
};
const getShallowTagEntityCount = createShallowEqualObjectSelector(getTagEntityCount, data => data);
const getTagIds: BaseSelector<any, string[]> = (state, props) => state.envMap[props.summary.id].tagIds;
const getTagOrderField: BaseSelector<any, TagOrderField> = (state, props) => state.envMap[props.summary.id].tabTags.tagOrderField;
const getSortedTagIds = createSelector(
    [getTagIds,
        getShallowTagMap,
        getTagOrderField,
        getShallowTagEntityCount],
    (tagIds, tagMap, tagOrderField, tagEntityCount) => {
        const orderMap: { [orderField in TagOrderField]: (id: string) => any } = {
            [TagOrderField.EntityCount]: (id: string) => tagEntityCount[id],
            [TagOrderField.Name]: (id: string) => tagMap[id] ? tagMap[id].name : '',
            [TagOrderField.Color]: (id: string) => tagMap[id] ? tagMap[id].color : '',
        };
        return _.orderBy(tagIds, orderMap[tagOrderField], tagOrderField === TagOrderField.Name ? 'asc' : 'desc');
    });
export default connect((state: AppState, ownProps: any) => {
    const {tabTags} = state.envMap[ownProps.summary.id];
    return {
        tagIds: getSortedTagIds(state, ownProps),
        tagMap: getShallowTagMap(state, ownProps),
        ...tabTags,
    };
})(TabManageTags);
