/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import React from 'react';
import c from 'classnames';
import {When} from 'react-if';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import fastMount from 'react-fast-mount';
import {prepareContextMenuHandlers} from 'react-context-menu-wrapper';

import Icon from '../Icon';
import TagGroup from '../TagGroup';
import Util from '../../../util/Util';
import {FolderIconData, getIconData} from '../../../util/IconUtil';
import {
    FileView,
    DefaultFileView,
    FileViewToClass,
    ColorsLight,
    ColorsDark,
    ThumbnailState,
    EnvironmentContext,
    EnvSummaryPropType,
    FilePropType,
} from '../../../util/typedef';

class FileEntry extends React.PureComponent {

    // noinspection JSUnusedGlobalSymbols
    static contextType = EnvironmentContext;

    static propTypes = {
        // Props used in redux.connect
        hash: PropTypes.string.isRequired,
        summary: EnvSummaryPropType.isRequired,

        // Props provided by redux.connect
        file: FilePropType.isRequired,

        // Props passed by parent
        view: PropTypes.number,
        showExtension: PropTypes.bool,
        collapseLongNames: PropTypes.bool,
        singleAndDoubleClickExclusive: PropTypes.bool,
        selected: PropTypes.bool,
        onSingleClick: PropTypes.func,
        onDoubleClick: PropTypes.func,
        displayIndex: PropTypes.number,
        contextMenuId: PropTypes.string,
    };

    static defaultProps = {
        selected: false,
        view: DefaultFileView,
        showExtension: true,
        collapseLongNames: false,
        singleAndDoubleClickExclusive: false,
    };

    constructor(props, context) {
        super(props);
        this.summary = context;

        const file = props.file;
        this.state = {
            thumbBgImage: null,
            icon: file.isDir ? FolderIconData : getIconData(file),
        };

        this.handlers = {};
        if (props.contextMenuId) {
            this.handlers = prepareContextMenuHandlers({id: props.contextMenuId, data: props.hash});
        }

        this.clickCount = 0;
        this.mounted = false;
        this.imageLoadPromise = null;
        this.triggerSingleClick = (event, displayIndex) => {
            this.clickCount = 0;
            if (props.onSingleClick) props.onSingleClick(props.file, event, displayIndex);
        };
        this.triggerDoubleClick = event => {
            this.clickCount = 0;
            if (props.onDoubleClick) this.props.onDoubleClick(props.file, event);
        };
    }

    componentDidMount() {
        const {file} = this.props;
        const {thumbState} = file;
        if (thumbState === ThumbnailState.Impossible) return;
        if (thumbState === ThumbnailState.Ready) this.loadThumbnail();
        else if (thumbState === ThumbnailState.Possible) {
            const summary = this.summary;
            Promise.resolve()
                .then(() => window.dataManager.requestFileThumbnail(summary.id, file.nixPath))
                .catch(window.handleErrorQuiet);
        }
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
        if (this.imageLoadPromise) this.imageLoadPromise.cancel();
    }

    // noinspection JSCheckFunctionSignatures
    componentDidUpdate(prevProps) {
        const oldFile = prevProps.file;
        const {thumbState} = this.props.file;
        if (oldFile.thumbState !== thumbState && thumbState === ThumbnailState.Ready) {
            this.loadThumbnail();
        }
    }

    loadThumbnail = () => {
        const {file} = this.props;
        const url = `${window.serverHost}/static/env/${this.summary.slug}/thumbs/${file.thumbName}`;
        _.defer(() => {
            if (!this.mounted) return;
            this.imageLoadPromise = Util.loadImage(url, file.thumbName)
                .then(() => this.setState({thumbBgImage: `url('${url}')`}))
                .catch(window.handleErrorQuiet);
        });
    };

    handleClick = event => {
        const {displayIndex, singleAndDoubleClickExclusive} = this.props;
        if (event.ctrlKey || event.shiftKey) return this.triggerSingleClick(event, displayIndex);

        this.clickCount++;
        if (this.clickCount === 1) {
            if (singleAndDoubleClickExclusive) {
                this.singleClickTimer = setTimeout(() => this.triggerSingleClick(event, displayIndex), 300);
            } else {
                this.triggerSingleClick(event, displayIndex);
                this.clickCount = 1;
                setTimeout(() => this.clickCount = 0, 300);
            }
        } else if (this.clickCount === 2) {
            clearTimeout(this.singleClickTimer);
            this.triggerDoubleClick(event);
        }
    };

    renderIcon(color = true) {
        const icon = this.state.icon;
        const style = {
            color: color ? ColorsLight[icon.colorCode] : 'inherit',
        };
        return <Icon name={icon.name} wrapper={false} style={style} iconModifier="fa-fw"/>;
    }

    render() {
        const {file, selected, view, showExtension, collapseLongNames, displayIndex} = this.props;

        // Prepare file name
        let name = file.name;
        if (collapseLongNames) {
            const length = name.length;
            const extLength = showExtension ? file.ext.length : 0;
            if (length + extLength > 65) {
                // TODO: Improve this code.
                const collapse = <span className="file-entry-name-collapse">&lt;...&gt;</span>;
                name = <span>
                    {name.slice(0, 30)}
                    {collapse}
                    {name.slice(length - 24 + extLength)}
                </span>;
            }
        }

        const isListView = view === FileView.List;

        const thumbBgImage = this.state.thumbBgImage;
        const thumbStyle = {backgroundImage: thumbBgImage};
        const iconStyle = !isListView ? {} : {color: ColorsDark[this.state.icon.colorCode]};
        const wrapperStyle = isListView ? {} : {backgroundColor: ColorsDark[this.state.icon.colorCode]};

        const viewClass = FileViewToClass(view);
        const entryClass = c({
            [viewClass]: true,
            'file-entry': true,
            'selected': selected,
        });
        const thumbnailClass = c({
            [viewClass]: true,
            'loaded': !!thumbBgImage,
            'file-entry-thumbnail': true,
        });

        return (
            <button {...this.handlers} className={entryClass} onClick={this.handleClick}
                    style={wrapperStyle} data-display-index={displayIndex}>

                <div className={thumbnailClass} style={thumbStyle}/>

                <When condition={!isListView}>
                    {selected && <div className={`file-entry-selected`}/>}
                    {file.entityId && <div className="file-entry-tags">
                        <TagGroup summary={this.summary} entityId={file.entityId} showEllipsis={collapseLongNames}/>
                    </div>}
                    <div className="file-entry-icon">
                        <div className="file-entry-icon-content">{this.renderIcon(true)}</div>
                    </div>
                </When>

                <div className="file-entry-name">
                    <span className="file-entry-name-icon" style={iconStyle}>{this.renderIcon(false)}</span>
                    {name}
                    {showExtension && <span className="file-entry-name-ext">{file.ext}</span>}
                    {isListView && file.entityId && <div className="file-entry-tags">
                        <TagGroup summary={this.summary} entityId={file.entityId}
                                  showEllipsis={collapseLongNames}/>
                    </div>}
                </div>

            </button>
        );
    };

}

export default connect((state, ownProps) => {
    const {summary, hash} = ownProps;
    const fileMap = state.envMap[summary.id].fileMap;
    const file = fileMap[hash];
    return {file};
})(fastMount(FileEntry));
// })(withPropChecker(FileEntry));
