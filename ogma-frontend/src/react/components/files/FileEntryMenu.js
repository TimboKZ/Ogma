/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import path from 'path';
import React from 'react';
import Denque from 'denque';
import Swal from 'sweetalert2';
import Promise from 'bluebird';
import equal from 'fast-deep-equal';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import {createSelector} from 'reselect';
import validFilename from 'valid-filename';
import ReactTags from 'react-tag-autocomplete';
import {hideAllContextMenus} from 'react-context-menu-wrapper';

import Icon from '../Icon';
import Util from '../../../util/Util';
import ModalUtil from '../../../util/ModalUtil';
import {createDeepEqualSelector} from '../../../redux/Selector';
import {EnvironmentContext, EnvRoutePaths} from '../../../util/typedef';


class FileEntryMenu extends React.Component {

    // noinspection JSUnusedGlobalSymbols
    static contextType = EnvironmentContext;

    static propTypes = {
        // Props used in redux.connect
        fileHash: PropTypes.string,
        summary: PropTypes.object.isRequired,
        selection: PropTypes.object.isRequired,

        // Props provided by redux.connect
        tags: PropTypes.arrayOf(PropTypes.object).isRequired,
        files: PropTypes.arrayOf(PropTypes.object).isRequired,
        entityIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        selectedTags: PropTypes.arrayOf(PropTypes.object).isRequired,

        // Props passed by parent
        id: PropTypes.string.isRequired,
        history: PropTypes.object,
        changePath: PropTypes.func,
        allowShowInBrowseTab: PropTypes.bool,
        confirmDeletions: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        allowShowInBrowseTab: false,
    };

    constructor(props, context) {
        super(props);
        this.summary = context;

        this.state = {
            selectedTags: [],
            tabOption: {id: 0, icon: 'file', name: 'File'},
        };

        this.tagAddQueue = new Denque();
        this.tagDeleteQueue = new Denque();
        this.debouncedCommitTagAddition = _.debounce(this.commitTagAddition, 50);
        this.debouncedCommitTagDeletion = _.debounce(this.commitTagDeletion, 50);
    }

    static getDerivedStateFromProps(props, state) {
        const {files, selectedTags} = props;
        const {tabOption} = state;
        const fileCount = files.length;
        const isMult = files.length > 1;
        const firstFile = files[0];

        const fileTab = {...state.tabOption};

        if (isMult) {
            fileTab.icon = 'copy';
            fileTab.name = `Selection (${fileCount})`;
        } else if (firstFile) {
            if (firstFile.isDir) {
                fileTab.icon = 'folder';
                fileTab.name = 'Folder';
            } else {
                fileTab.icon = 'file';
                fileTab.name = 'File';
            }
        }
        let newState = null;
        if (selectedTags !== state.selectedTags) newState = {selectedTags};
        if (!equal(fileTab, tabOption)) newState = {...newState, tabOption: fileTab};
        return newState;
    }

    commitTagAddition = () => {
        const {files} = this.props;
        const id = this.summary.id;
        const queue = this.tagAddQueue;
        this.tagAddQueue = new Denque();
        const tagNames = new Array(queue.length);
        for (let i = 0; i < queue.length; ++i) {
            tagNames[i] = queue.pop().name;
        }
        const paths = files.map(f => f.nixPath);
        window.ipcModule.addTagsToFiles({id, tagNames, paths})
            .catch(window.handleError);
    };

    commitTagDeletion = () => {
        const {entityIds} = this.props;
        const id = this.summary.id;
        const queue = this.tagDeleteQueue;
        this.tagDeleteQueue = new Denque();
        const tagIds = new Array(queue.length);
        for (let i = 0; i < queue.length; ++i) {
            tagIds[i] = queue.pop().id;
        }
        window.ipcModule.removeTagsFromFiles({id, tagIds, entityIds})
            .catch(window.handleError);
    };

    handleTagAddition = tag => {
        const selectedTags = [].concat(this.state.selectedTags, tag);
        this.setState({selectedTags});

        this.tagAddQueue.push(tag);
        this.debouncedCommitTagAddition();
    };

    handleTagDeletion = tagIndex => {
        const selectedTags = this.state.selectedTags.slice(0);
        const tag = selectedTags.splice(tagIndex, 1)[0];
        this.setState({selectedTags});

        this.tagDeleteQueue.push(tag);
        this.debouncedCommitTagDeletion();
    };

    getHandler(promiseFunc, hideMenu = false) {
        return () => {
            if (hideMenu) hideAllContextMenus();
            Promise.resolve()
                .then(() => promiseFunc())
                .catch(window.handleError);
        };
    };

    // noinspection JSMethodCanBeStatic
    renderDropdownButtons(buttons) {
        const comps = new Array(buttons.length);

        for (let i = 0; i < buttons.length; ++i) {
            const button = buttons[i];
            if (!button) continue;

            comps[i] = <button key={button.name} className="dropdown-item text-ellipsis" onClick={button.onClick}>
                <Icon name={button.icon}/> {button.name}
            </button>;
        }

        return comps;
    }

    renderTagOptions() {
        const {files, tags} = this.props;
        const fileCount = files.length;
        if (fileCount === 0) return null;

        let hasFiles = false;
        let hasFolders = false;
        let hasMixed = false;
        for (const file of files) {
            if (file.isDir) hasFolders = true;
            else hasFiles = true;
            if (hasFiles && hasFolders) {
                hasMixed = true;
                break;
            }
        }

        if (hasMixed) {
            return <div className="dropdown-item" style={{color: '#857700'}}>
                <p><Icon name="exclamation-triangle"/> Tagging is not supported for mixed selections (files & folders).
                </p>
            </div>;
        }

        if (hasFolders && !hasFiles) {
            return <ReactTags tags={this.state.selectedTags} suggestions={tags} handleDelete={this.handleTagDeletion}
                              handleAddition={this.handleTagAddition} minQueryLength={1} allowNew={true}
                              allowBackspace={false} placeholder="Add sink"/>;
        }

        return <ReactTags tags={this.state.selectedTags} suggestions={tags} handleDelete={this.handleTagDeletion}
                          handleAddition={this.handleTagAddition} minQueryLength={1} allowNew={true}
                          allowBackspace={false} placeholder="Add tag"/>;
    }

    renderFileOptions() {
        const {files, changePath, allowShowInBrowseTab, history} = this.props;
        const fileCount = files.length;
        if (fileCount === 0) return null;

        let hasFiles = false;
        let hasFolders = false;
        for (const file of files) {
            if (file.isDir) hasFolders = true;
            else hasFiles = true;
            if (hasFiles && hasFolders) {
                break;
            }
        }

        const s = this.summary;
        const ipc = window.ipcModule;
        const isMult = files.length > 1;

        const firstFile = files[0];
        const firstFileReqData = {id: s.id, path: firstFile.nixPath};

        const buttons = new Array(6);

        if (!isMult) {
            const file = firstFile;
            const isDir = file.isDir;
            if (!isDir || changePath) {
                const openContent = <React.Fragment>Open <strong>{file.base}</strong></React.Fragment>;
                const openFunc = isDir ? () => this.props.changePath(file.nixPath) : () => ipc.openFile(firstFileReqData);
                buttons[0] = {
                    icon: 'envelope-open-text', name: openContent,
                    onClick: this.getHandler(openFunc, true),
                };
            }

            if (allowShowInBrowseTab) {
                const urlPart = path.join(`/env/${s.slug}`, EnvRoutePaths.browse);
                const hashPart = path.dirname(file.nixPath);
                buttons[1] = {
                    icon: 'eye', name: 'Show in browse tab',
                    onClick: () => history.push(`${urlPart}#${hashPart}`),
                };
            }

        }

        if (window.dataManager.isLocalClient()) {
            buttons[2] = {
                icon: 'external-link-alt', name: 'Show in files',
                onClick: this.getHandler(() => ipc.openInExplorer(firstFileReqData), true),
            };
        }

        if (hasFiles && !hasFolders) {
            const suf = fileCount === 1 ? '' : 's';
            const sendSinkData = {id: s.id, paths: files.map(f => f.nixPath)};
            buttons[3] = {
                icon: 'filter', name: `Move file${suf} to relevant sink${suf}`,
                onClick: this.getHandler(() => ipc.moveFilesToSink(sendSinkData), true),
            };
        }

        if (!isMult) {
            const file = firstFile;
            const objName = file.isDir ? 'folder' : 'file';
            const renameString = `Rename ${objName}`;
            const renameClick = () => {
                // noinspection JSUnusedGlobalSymbols,JSCheckFunctionSignatures
                return ModalUtil.fire({
                    title: 'Choose a new name:',
                    input: 'text',
                    inputValue: file.name,
                    inputAttributes: {autocapitalize: 'off'},
                    inputValidator: value => {
                        value = value.trim();
                        if (!value) return 'The name cannot be blank.';
                        if (!validFilename(value)) return 'The filename you specified is invalid.';
                    },
                    showCancelButton: true,
                    confirmButtonText: renameString,
                    showLoaderOnConfirm: true,
                    preConfirm: (newFileName) => {
                        const oldPath = file.nixPath;
                        const newPath = path.join(path.dirname(file.nixPath), `${newFileName.trim()}${file.ext}`);
                        return window.ipcModule.renameFile({id: this.summary.id, oldPath, newPath})
                            .catch(error => Swal.showValidationMessage(`Renaming failed: ${error}`));
                    },
                    allowOutsideClick: () => !Swal.isLoading(),
                });
            };
            buttons[4] = {icon: 'i-cursor', name: renameString, onClick: this.getHandler(renameClick, true)};
        }

        const removeFunc = () => {
            let removeTitle;
            let removeText;
            if (isMult) {
                removeTitle = `Move ${files.length} files to trash?`;

                const count = 5;
                const names = _.map(files.slice(0, count), f => Util.truncate(f.base, 40));
                removeText = `Files are "${names.join('", "')}"`;
                if (count < fileCount) removeText += ` and ${fileCount - count} others.`;
                else removeText += '.';

                if (hasFolders) removeText += ' Some of them are folders.';
            } else {
                const objName = firstFile.isDir ? 'folder' : 'file';
                removeTitle = `Move ${objName} to trash?`;
                removeText = `The ${objName} is "${Util.truncate(firstFile.base, 40)}".`;
            }
            return Promise.resolve()
                .then(() => {
                    if (!this.props.confirmDeletions) return true;

                    return ModalUtil.confirm({
                        title: removeTitle,
                        text: removeText,
                        confirmButtonText: 'Yes',
                        cancelButtonText: 'No, cancel',
                    });
                })
                .then(result => {
                    if (!result) return null;
                    return ipc.removeFiles({id: s.id, paths: _.map(files, f => f.nixPath)});
                });
        };
        buttons[5] = {
            icon: 'trash', name: 'Move to trash',
            onClick: this.getHandler(removeFunc, true),
        };

        return this.renderDropdownButtons(buttons);
    }

    render() {
        const {tabOption} = this.state;

        return (
            <div className="context-menu dropdown is-active">

                <div className="context-menu-header">
                    <Icon name={tabOption.icon}/> {tabOption.name}
                </div>

                <div className="dropdown-menu" id="dropdown-menu" role="menu">
                    <div className="dropdown-content">
                        <div style={{position: 'relative', zIndex: 2}}>{this.renderTagOptions()}</div>
                        <hr className="dropdown-divider"/>
                        {this.renderFileOptions()}
                    </div>
                </div>

            </div>
        );
    };

}

const getSelection = (_, props) => props.selection;
const getFileHash = (_, props) => props.fileHash;
const getFileHashes = createSelector([getSelection, getFileHash], (selection, fileHash) => {
    const selectedHashes = Object.keys(selection);
    let fileHashes = [];
    if (selectedHashes.length === 1) fileHashes = [fileHash];
    else fileHashes = selectedHashes;
    fileHashes = fileHashes.filter(h => !!h);
    return fileHashes;
});

const getFileMap = (state, props) => state.envMap[props.summary.id].fileMap;
const getFiles = createSelector([getFileMap, getFileHashes], (fileMap, hashes) => {
    let files = hashes.map(h => fileMap[h]);
    files = files.filter(f => !!f);
    return files;
});
const getFilesDeep = createDeepEqualSelector([getFiles], files => files);

const getEntityMap = (state, props) => state.envMap[props.summary.id].entityMap;
const getTagMap = (state, props) => state.envMap[props.summary.id].tagMap;
const getFilesEntityIdsSelectedTags = createSelector([getEntityMap, getTagMap, getFilesDeep], (entityMap, tagMap, files) => {
    const entityIds = files.map(f => f.entityId).filter(e => !!e);
    const entities = entityIds.map(id => entityMap[id]);
    const selectedTagIds = _.union(...entities.map(e => e.tagIds));
    const selectedTags = _.map(selectedTagIds, tagId => tagMap[tagId]);
    return {files, entityIds, selectedTags};
});

const getTagIds = (state, props) => state.envMap[props.summary.id].tagIds;
const getTags = createSelector([getTagIds, getTagMap], (tagIds, tagMap) => {
    return tagIds.map(tagId => tagMap[tagId]);
});

export default connect((state, ownProps) => {
    return {
        tags: getTags(state, ownProps),
        ...getFilesEntityIdsSelectedTags(state, ownProps),
    };
})(FileEntryMenu);
