/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import React from 'react';
import c from 'classnames';
import * as PropTypes from 'prop-types';
import {FixedSizeGrid as Grid, VariableSizeList as List} from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import Icon from '../Icon';
import FileEntry from './FileEntry';
import {EnvSummaryPropType, FileView, FileViewToClass} from '../../../util/typedef';

const FileViewConfigs = {
    [FileView.MediumThumb]: {columnWidth: 250, rowHeight: 150},
    [FileView.LargeThumb]: {columnWidth: 400, rowHeight: 300},
};

const ListItemSize = 31;
const GutterSize = 4;

class FileList extends React.Component {

    static propTypes = {
        // Props passed by parent
        view: PropTypes.number.isRequired,
        summary: EnvSummaryPropType.isRequired,
        fileHashes: PropTypes.arrayOf(PropTypes.string),
        loadingCount: PropTypes.number,
        selection: PropTypes.object.isRequired,
        contextMenuId: PropTypes.string,
        showExtensions: PropTypes.bool.isRequired,
        collapseLongNames: PropTypes.bool.isRequired,
        handleSingleClick: PropTypes.func.isRequired,
        handleDoubleClick: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.summary = props.summary;
        this.listRef = null;
        this.debouncedRequestListUpdate = _.debounce(this.requestListUpdate, 10);
    }

    componentDidMount() {
        window.addEventListener('resize', this.requestListUpdate);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.requestListUpdate);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const {selection} = this.props;
        if (selection !== prevProps.selection) {
            this.debouncedRequestListUpdate();
        }
    }

    requestListUpdate = () => {
        if (this.listRef && this.listRef.current) this.listRef.current.resetAfterIndex(0);
    };

    getItemSize = index => {
        const elem = this.elemMap[index];
        if (elem) return Math.max(elem.clientHeight, ListItemSize);
        return ListItemSize;
    };

    getItemKey = input => {
        let index;
        if (typeof input === 'number') {
            index = input;
        } else {
            const {rowIndex, columnIndex, data} = input;
            index = rowIndex * data.columnCount + columnIndex;
        }
        const {fileHashes} = this.props;
        const hash = fileHashes[index];
        return hash ? hash : index;
    };

    renderFileEntry = entryData => {
        const {
            fileHashes, showExtensions, collapseLongNames, selection, contextMenuId,
            handleSingleClick, handleDoubleClick, view,
        } = this.props;
        const {index: listIndex, columnIndex, rowIndex, style, data} = entryData;

        let index = listIndex;
        let entryStyle = style;
        if (!listIndex && listIndex !== 0) {
            const {columnCount} = data;
            index = rowIndex * columnCount + columnIndex;
            entryStyle = {
                ...entryStyle,
                left: style.left + GutterSize,
                top: style.top + GutterSize,
                width: style.width - GutterSize,
                height: style.height - GutterSize,
            };
        }
        if (index >= fileHashes.length) return null;

        const assignElem = elem => {
            if (this.elemMap[index]) return;
            this.elemMap[index] = elem;
            this.debouncedRequestListUpdate();
        };

        const hash = fileHashes[index];
        const selected = !!selection[hash];
        return <div key={hash} style={entryStyle}>
            <div ref={assignElem}>
                <FileEntry hash={hash} summary={this.summary} displayIndex={index} view={view}
                           showExtension={showExtensions} collapseLongNames={collapseLongNames}
                           selected={selected} contextMenuId={contextMenuId}
                           onSingleClick={handleSingleClick} onDoubleClick={handleDoubleClick}/>
            </div>
        </div>;
    };

    renderFiles() {
        this.elemMap = {};
        const {fileHashes, loadingCount, view} = this.props;

        const empty = fileHashes && fileHashes.length === 0;
        const loading = !fileHashes || (empty && loadingCount > 0);

        if (loading) return <div className="file-list-text"><Icon name="cog" animation={true}/> Loading...</div>;
        else if (empty) return <div className="file-list-text">No files to show.</div>;


        if (view === FileView.List) {
            this.listRef = React.createRef();
            return (
                <AutoSizer>
                    {({height, width}) => {
                        const rowCount = fileHashes.length;
                        return (
                            <List
                                ref={this.listRef}
                                width={width}
                                height={height}
                                itemCount={rowCount}
                                itemSize={this.getItemSize}
                                estimatedItemSize={ListItemSize}
                                overscanCount={10}>
                                {this.renderFileEntry}
                            </List>
                        );
                    }}
                </AutoSizer>
            );
        }

        this.listRef = null;
        const sizeData = FileViewConfigs[view];
        return (
            <AutoSizer>
                {({height, width}) => {
                    const columnWidth = sizeData.columnWidth + GutterSize;
                    const rowHeight = sizeData.rowHeight + GutterSize;

                    const columnCount = Math.max(1, Math.floor((width - 20) / columnWidth));
                    const rowCount = Math.ceil(fileHashes.length / columnCount);

                    return (
                        <Grid
                            width={width}
                            height={height}
                            columnWidth={columnWidth}
                            rowHeight={rowHeight}
                            columnCount={columnCount}
                            rowCount={rowCount}
                            overscanRowCount={3}
                            itemKey={this.getItemKey}
                            itemData={{columnCount, rowCount}}>
                            {this.renderFileEntry}
                        </Grid>
                    );
                }}
            </AutoSizer>
        );

    }

    render() {
        const {view} = this.props;

        const className = c({
            'file-list': true,
            [FileViewToClass(view)]: true,
        });
        return <div className={className}>
            {this.renderFiles()}
        </div>;
    };

}

export default FileList;
