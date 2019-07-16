/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import path from 'path';
import React from 'react';
import Fuse from 'fuse.js';
import Swal from 'sweetalert2';
import Promise from 'bluebird';
import {connect} from 'react-redux';
import deepEqual from 'fast-deep-equal';
import * as PropTypes from 'prop-types';
import {createSelector} from 'reselect';
import validFilename from 'valid-filename';
import {NotificationManager} from 'react-notifications';
import {ContextMenuWrapper} from 'react-context-menu-wrapper';

import FileList from './FileList';
import Util from '../../../util/Util';
import FilePreview from './FilePreview';
import FileStatusBar from './FileStatusBar';
import FileEntryMenu from './FileEntryMenu';
import ModalUtil from '../../../util/ModalUtil';
import {createDeepEqualSelector} from '../../../redux/Selector';
import {EnvSummaryPropType, ExplorerOptions, ExplorerOptionsDefaults, FileView, KeyCode} from '../../../util/typedef';

const FuseOptions = {
    id: 'hash',
    keys: ['base'],
    threshold: 0.4,
};

class FileExplorer extends React.Component {

    static propTypes = {
        // Props used in redux.connect
        path: PropTypes.string,
        summary: EnvSummaryPropType.isRequired,
        fileHashes: PropTypes.arrayOf(PropTypes.string),

        // Props provided by redux.connect
        dirReadTime: PropTypes.number,
        slimFiles: PropTypes.arrayOf(PropTypes.object),

        // Props passed by parent
        history: PropTypes.object,
        changePath: PropTypes.func,
        showPreview: PropTypes.bool,
        loadingCount: PropTypes.number,
        contextMenuId: PropTypes.string,
        allowFolderCreation: PropTypes.bool,
        allowShowInBrowseTab: PropTypes.bool,
    };

    static defaultProps = {
        showPreview: false,
        loadingCount: 0,
        allowFolderCreation: false,
        allowShowInBrowseTab: false,
    };

    constructor(props) {
        super(props);
        this.summary = props.summary;

        this.state = {
            filter: '',
            selection: {},
            contextFileHash: null,
            options: {...ExplorerOptionsDefaults},

            showPreview: props.showPreview,
        };
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !deepEqual(this.props, nextProps) || !deepEqual(this.state, nextState);
    }

    static sortFiles(slimFiles, options) {
        return slimFiles ? Util.sortFiles(slimFiles, options).map(f => f.hash) : null;
    };

    static combineHashes(sortedHashes, filteredHashes) {
        if (sortedHashes === filteredHashes) return filteredHashes;

        const filteredMap = {};
        for (const hash of filteredHashes) filteredMap[hash] = true;

        const fileHashes = new Array(sortedHashes.length);
        let j = 0;
        for (let i = 0; i < sortedHashes.length; ++i) {
            const hash = sortedHashes[i];
            if (filteredMap[hash]) {
                fileHashes[j++] = hash;
            }
        }
        return fileHashes.slice(0, j);
    }

    static getDerivedStateFromProps(props, state) {
        const {slimFiles} = props;
        const {filter, options} = state;

        if (!deepEqual(slimFiles, state.slimFiles)) {
            const sortedHashes = FileExplorer.sortFiles(slimFiles, options);
            let fuse = null;
            let filteredHashes = sortedHashes;
            if (slimFiles && filter) {
                let fuse = new Fuse(slimFiles, FuseOptions);
                filteredHashes = fuse.search(state.filter);
            }
            return {
                fuse,
                slimFiles,
                sortedHashes,
                filteredHashes,
                fileHashes: FileExplorer.combineHashes(sortedHashes, filteredHashes),
            };
        }
        return null;
    }

    componentDidMount() {
        const {path: currPath, dirReadTime} = this.props;
        const {slimFiles} = this.state;
        if (currPath) {
            const selection = {};
            this.setState({selection});
            const cachedHashes = slimFiles ? slimFiles.map(f => f.hash) : null;
            Promise.resolve()
                .then(() => window.dataManager.requestDirectoryContent(this.summary.id, currPath, dirReadTime, cachedHashes))
                .catch(window.handleError);
        }

        document.addEventListener('keydown', this.handleKeydown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const {path: currPath, dirReadTime} = this.props;
        const {slimFiles} = this.state;
        if (currPath !== prevProps.path) {
            const selection = {};
            this.setState({selection});
            const cachedHashes = slimFiles ? slimFiles.map(f => f.hash) : null;
            window.dataManager.requestDirectoryContent(this.summary.id, currPath, dirReadTime, cachedHashes)
                .catch(window.handleError);
        }
    }

    handleKeydown = event => {
        const {path: currPath, changePath} = this.props;
        const {fileHashes, selection: oldSelection, options} = this.state;

        const tagName = event.target.tagName.toUpperCase();
        const isInInput = tagName === 'INPUT' || tagName === 'TEXTAREA';
        if (isInInput) return;

        switch (event.keyCode) {
            case KeyCode.A:
                if (event.ctrlKey) {
                    event.preventDefault();
                    const selection = {};
                    if (_.size(oldSelection) !== fileHashes.length) {
                        for (const hash of fileHashes) selection[hash] = true;
                    }
                    this.setState({selection});
                }
                break;
            case KeyCode.C:
                event.preventDefault();
                const newFileView = (options[ExplorerOptions.FileView] + 1) % FileView.EnumMax;
                this.handleOptionChange(ExplorerOptions.FileView, newFileView);
                break;
            case KeyCode.Backspace:
                if (changePath && currPath !== '/') changePath(path.dirname(currPath));
                break;
            default:
            // Do nothing
        }
    };

    handleFilterChange = filter => {
        if (filter === this.state.filter) return;

        this.setState(prevState => {
            const {slimFiles, sortedHashes} = prevState;
            let filteredHashes = sortedHashes;
            if (filter) {
                let {fuse} = prevState;
                if (!fuse && slimFiles) fuse = new Fuse(slimFiles, FuseOptions);
                filteredHashes = fuse ? fuse.search(filter) : sortedHashes;
            }
            return {
                filter,
                filteredHashes,
                fileHashes: FileExplorer.combineHashes(sortedHashes, filteredHashes),
            };
        });
    };

    handleOptionChange = (optionId, value) => {
        if (optionId === ExplorerOptions.SortOrder || optionId === ExplorerOptions.FoldersFirst) {
            this.setState(prevState => {
                const options = {...prevState.options, [optionId]: value};
                const sortedHashes = FileExplorer.sortFiles(prevState.slimFiles, options);
                return {
                    options,
                    sortedHashes,
                    fileHashes: FileExplorer.combineHashes(sortedHashes, prevState.filteredHashes),
                };
            });
        } else if (optionId === ExplorerOptions.ShowHidden) {
            this.setState(prevState => {
                const options = {...prevState.options, [optionId]: value};
                const sortedHashes = FileExplorer.sortFiles(prevState.slimFiles, options);
                return {
                    options,
                    sortedHashes,
                    fileHashes: FileExplorer.combineHashes(sortedHashes, prevState.filteredHashes),
                };
            });
        } else {
            // For all other options, just update the `options` state
            this.setState(prevState => ({options: {...prevState.options, [optionId]: value}}));
        }

        // TODO: Update global Redux options snapshot.
    };

    onOptionChange = (optionId, value) => {
        const {options} = this.state;
        if (value === options[optionId]) return;
        this.handleOptionChange(optionId, value);
    };

    handleSingleClick = (file, event, displayIndex) => {
        const {fileHashes} = this.state;

        const hash = file.hash;

        const triggeredByKeyboard = event.detail === 0;
        const multiSelection = event.ctrlKey || triggeredByKeyboard;
        const shiftKey = event.shiftKey;
        this.setState(prevState => {
            const oldSel = prevState.selection;
            const oldSelSize = _.size(oldSel);

            let selection = {};
            const rangeSelection = prevState.lastSelectionIndex !== -1 ? shiftKey : false;
            if (rangeSelection) {
                let a = prevState.lastSelectionIndex;
                let b = displayIndex;
                if (a > b) {
                    const temp = b;
                    b = a;
                    a = temp;
                }
                for (let i = a; i < b + 1; ++i) {
                    selection[fileHashes[i]] = true;
                }
            } else {
                if (multiSelection) selection = {...oldSel};
                if (oldSel[hash] && oldSelSize <= 1) {
                    delete selection[hash];
                } else {
                    selection[hash] = !selection[hash];
                }
            }

            const updateSelectionIndex = (prevState.lastSelectionIndex === -1) || !(multiSelection || shiftKey);
            let newSelectionIndex = updateSelectionIndex ? displayIndex : prevState.lastSelectionIndex;
            return {selection, lastSelectionIndex: newSelectionIndex};
        });
    };

    handleDoubleClick = file => {
        const {changePath} = this.props;
        if (file.isDir) {
            if (changePath) changePath(file.nixPath);
        } else {
            if (window.dataManager.isLocalClient()) {
                Promise.resolve()
                    .then(() => window.ipcModule.openFile({id: this.summary.id, path: file.nixPath}))
                    .catch(window.handleError);
            } else {
                NotificationManager.warning('Opening files in the browser is not supported yet.');
            }
        }
    };

    handleContextMenuShow = hash => {
        this.setState(prevState => {
            const oldSel = prevState.selection;
            const oldSelSize = _.size(oldSel);
            if (oldSelSize <= 1) {
                return {
                    selection: {[hash]: true},
                };
            }
            return null;
        });
    };

    handleCreateFolder = () => {
        const {path: currPath} = this.props;
        if (!currPath) return;

        // noinspection JSUnusedGlobalSymbols,JSCheckFunctionSignatures
        return ModalUtil.fire({
            title: 'Choose folder name:',
            input: 'text',
            inputValue: '',
            inputAttributes: {autocapitalize: 'off'},
            inputValidator: value => {
                value = value.trim();
                if (!value) return 'The name cannot be blank.';
                if (!validFilename(value)) return 'The filename you specified is invalid.';
            },
            showCancelButton: true,
            confirmButtonText: 'Create folder',
            showLoaderOnConfirm: true,
            preConfirm: newFolderName => {
                const newFolderPath = path.join(currPath, newFolderName.trim());
                return window.ipcModule.createFolder({id: this.summary.id, path: newFolderPath})
                    .catch(error => Swal.showValidationMessage(`Folder creation failed: ${error}`));
            },
            allowOutsideClick: () => !Swal.isLoading(),
        });
    };

    render() {
        const {changePath, loadingCount, contextMenuId, allowShowInBrowseTab, history, allowFolderCreation} = this.props;
        const {filter, slimFiles, fileHashes, selection, options, showPreview} = this.state;

        const fileCount = fileHashes ? fileHashes.length : -1;
        const hiddenCount = (slimFiles ? slimFiles.length : -1) - fileCount;
        const selectionSize = _.size(selection);

        const renderContextMenu = hash =>
            <FileEntryMenu id={contextMenuId} fileHash={hash} changePath={changePath} summary={this.summary}
                           selection={selection} confirmDeletions={options[ExplorerOptions.ConfirmDeletions]}
                           allowShowInBrowseTab={allowShowInBrowseTab} history={history}/>;

        return (
            <div className="file-explorer">
                <FileStatusBar filter={filter} onFilerChange={this.handleFilterChange}
                               fileCount={fileCount} hiddenCount={hiddenCount}
                               selectionSize={selectionSize} loadingCount={loadingCount}
                               options={options} onOptionChange={this.onOptionChange}
                               createFolder={allowFolderCreation ? this.handleCreateFolder : null}/>

                <FileList summary={this.summary} fileHashes={fileHashes}
                          selection={selection} contextMenuId={contextMenuId}
                          view={options[ExplorerOptions.FileView]}
                          showExtensions={options[ExplorerOptions.ShowExtensions]}
                          collapseLongNames={options[ExplorerOptions.CollapseLongNames]}
                          handleSingleClick={this.handleSingleClick}
                          handleDoubleClick={this.handleDoubleClick}/>

                {showPreview && <FilePreview/>}

                <ContextMenuWrapper id={contextMenuId} hideOnSelfClick={false} onShow={this.handleContextMenuShow}
                                    render={renderContextMenu}/>
            </div>
        );
    };

}

const getFileMap = (state, props) => state.envMap[props.summary.id].fileMap;
const getData = (_, props) => ({path: props.path, fileHashes: props.fileHashes});
const getReadTimeAndFileHashes = createSelector([getFileMap, getData], (fileMap, data) => {
    const {path, fileHashes: hashes} = data;
    let dirReadTime = 0;
    let fileHashes = null;

    if (!path && path !== '') fileHashes = hashes;
    else {
        const dirFile = fileMap[Util.getFileHash(path)];
        if (dirFile) {
            dirReadTime = dirFile.dirReadTime;
            fileHashes = dirFile.fileHashes;
        }
    }
    return {dirReadTime, fileHashes};
});
const getSlimFiles = createSelector([getFileMap, getReadTimeAndFileHashes], (fileMap, data) => {
    const {dirReadTime, fileHashes} = data;
    let slimFiles = null;
    if (fileHashes) {
        // TODO: Perhaps not just hide empty files?
        const files = fileHashes.map(h => fileMap[h]).filter(f => !!f);
        slimFiles = files.map(f => ({
            hash: f.hash,
            base: f.base,
            isDir: f.isDir,
        }));
    }
    return {dirReadTime, slimFiles};
});
const getSlimFilesDeep = createDeepEqualSelector([getSlimFiles], data => data);

export default connect((state, ownProps) => {
    return {...getSlimFilesDeep(state, ownProps)};
})(FileExplorer);
