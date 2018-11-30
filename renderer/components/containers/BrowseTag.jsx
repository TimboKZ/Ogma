/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const _ = require('lodash');
const path = require('path');
const React = require('react');
const PropTypes = require('prop-types');
const {shell} = require('electron');

const {StateProps} = require('../../util/GlobalState');
const {SortOrder} = require('../helpers/SortPicker');
const {View} = require('../helpers/ViewPicker');
const Util = require('../../../shared/Util');
const Icon = require('../helpers/Icon');
const FileEntry = require('../helpers/FileEntry');

const Options = {
    CollapseLong: 'collapse-long',
    FoldersFirst: 'folders-first',
    ShowExtensions: 'show-exts',
    ShowHidden: 'show-hidden',
};

class BrowseTag extends React.Component {

    static prevDir = null;
    static propTypes = {
        envSummary: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            currentDir: this.props.envSummary.root,
            currentFiles: null,
            sort: window.globalState.get(StateProps.EnvSort),
            view: window.globalState.get(StateProps.EnvView),
            optionState: {
                [Options.CollapseLong]: true,
                [Options.FoldersFirst]: true,
                [Options.ShowExtensions]: true,
                [Options.ShowHidden]: true,
            },
        };

        this.optionCheckboxes = [
            {id: Options.CollapseLong, name: 'Collapse long names'},
            {id: Options.FoldersFirst, name: 'Show folders first'},
            {id: Options.ShowExtensions, name: 'Show extensions'},
            {id: Options.ShowHidden, name: 'Show hidden files'},
        ];
        this.optionButtons = [
            {icon: 'sync-alt', name: 'Refresh directory', callback: () => null},
            {icon: 'folder-minus', name: 'Clear file cache', callback: () => null},
        ];

        this.globalStateChange = this.globalStateChange.bind(this);
        this.optionStateChange = this.optionStateChange.bind(this);
        this.fileEntrySingleClick = this.fileEntrySingleClick.bind(this);
        this.fileEntryDoubleClick = this.fileEntryDoubleClick.bind(this);
    }

    static getDerivedStateFromProps(props, state) {
        const newDirState = BrowseTag.parseDir(props, state);
        if (newDirState) state = newDirState;
        return state;
    }

    componentDidMount() {
        window.globalState.addListener(StateProps.EnvSort, this.globalStateChange, false);
        window.globalState.addListener(StateProps.EnvView, this.globalStateChange, false);
    }

    componentWillUnmount() {
        window.globalState.removeListener(StateProps.EnvSort, this.globalStateChange);
        window.globalState.removeListener(StateProps.EnvView, this.globalStateChange);
        BrowseTag.prevDir = null;
    }

    static parseDir(props, state) {
        // Do nothing if the directory hasn't changed
        if (BrowseTag.prevDir && BrowseTag.prevDir === state.currentDir) return null;

        // Otherwise parse new directory and update the prevDir reference
        BrowseTag.prevDir = state.currentDir;
        const fileManager = window.dataManager.getFileManager({envId: props.envSummary.id});
        state.currentFiles = fileManager.fetchFiles({dir: state.currentDir});
        return state;
    }

    changeDirTo(newDir) {
        this.setState({currentDir: newDir});
    }

    globalStateChange(propName, propValue) {
        switch (propName) {
            case StateProps.EnvSort:
                this.setState({sort: propValue});
                break;
            case StateProps.EnvView:
                this.setState({view: propValue});
                break;
            default:
                // Do nothing for unknown properties
                break;
        }
    }

    optionStateChange(event) {
        this.setState({
            optionState: {
                ...this.state.optionState,
                [event.target.name]: event.target.checked,
            },
        });
    }

    /**
     * @param {FileData} file
     */
    fileEntrySingleClick(file) {
        if (file.name === '..') this.changeDirTo(file.path);
    }

    /**
     * @param {FileData} file
     */
    fileEntryDoubleClick(file) {
        if (file.isDirectory) this.changeDirTo(file.path);
        else if (file.isFile) shell.openItem(file.path);
    }

    renderBreadcrumbs() {
        const summary = this.props.envSummary;
        const relPath = path.relative(summary.root, this.state.currentDir);
        const rootName = path.basename(summary.root);

        const parts = relPath === '' ? [] : relPath.split(path.sep);
        const comps = new Array(1 + parts.length);
        let currDir = path.dirname(summary.root);
        let reverseDir = '';
        for (let i = 0; i < comps.length; i++) {
            const dirName = i === 0 ? rootName : parts[i - 1];
            const newDir = path.join(currDir, dirName);
            const func = () => this.changeDirTo(newDir);

            reverseDir = `${dirName}-${reverseDir}`;
            const key = `${summary.id}-${reverseDir}`;
            const activeClass = i === comps.length - 1 ? 'is-active' : '';

            let comp;
            if (i === 0) {
                comp = <React.Fragment>
                    <Icon name="star"/><span><strong>{dirName}</strong> (Root)</span>
                </React.Fragment>;
            } else {
                comp = dirName;
            }

            currDir = newDir;
            comps[i] = <li key={key} className={activeClass}><a onClick={func}>{comp}</a></li>;
        }
        return comps;
    }

    renderOptionCheckboxes() {
        const checkboxes = this.optionCheckboxes;
        const comps = new Array(checkboxes.length);
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = checkboxes[i];
            const key = `${this.props.envSummary.id}-${checkbox.id}`;
            comps[i] = <div key={key} className="dropdown-item">
                <div className="field">
                    <input className="is-checkradio" id={`checkbox-${checkbox.id}`} type="checkbox"
                           name={checkbox.id} checked={this.state.optionState[checkbox.id]}
                           onChange={this.optionStateChange}/>
                    <label htmlFor={`checkbox-${checkbox.id}`}>{checkbox.name}</label>
                </div>
            </div>;
        }
        return comps;
    }

    renderOptionButtons() {
        const buttons = this.optionButtons;
        const comps = new Array(buttons.length);
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const key = `${this.props.envSummary.id}-${button.name}`;
            comps[i] = <a key={key} className="dropdown-item" onClick={button.callback}>
                <Icon name={button.icon} wrapper={false}/>&nbsp;&nbsp;&nbsp;<span>{button.name}</span>
            </a>;
        }
        return comps;
    }

    renderFiles() {
        const files = this.state.currentFiles;
        if (!files) return <h1>Loading...</h1>;

        const fileComps = [];
        if (this.state.currentDir !== this.props.envSummary.root) {
            const filePath = path.normalize(path.join(this.state.currentDir, '..'));
            const parentDir = Util.getFileData({filePath});
            parentDir.name = '..';
            fileComps.push(<FileEntry key={`parent-entry-${parentDir.path}`}
                                      onEntrySingleClick={this.fileEntrySingleClick}
                                      onEntryDoubleClick={this.fileEntryDoubleClick}
                                      file={parentDir} view={this.state.view}
                                      collapseLongNames={this.state.optionState[Options.CollapseLong]}
                                      showExtension={this.state.optionState[Options.ShowExtensions]}/>);
        }

        const compare = (fileA, fileB) => {
            if (this.state.optionState[Options.FoldersFirst]) {
                if (fileA.isDirectory && !fileB.isDirectory) return -1;
                if (!fileA.isDirectory && fileB.isDirectory) return 1;
            }

            return fileA.name.localeCompare(fileB.name);
        };
        files.sort(compare);

        for (const file of files) {
            fileComps.push(<FileEntry key={`entry-${file.path}`}
                                      onEntrySingleClick={this.fileEntrySingleClick}
                                      onEntryDoubleClick={this.fileEntryDoubleClick}
                                      file={file} view={this.state.view}
                                      collapseLongNames={this.state.optionState[Options.CollapseLong]}
                                      showExtension={this.state.optionState[Options.ShowExtensions]}/>);
        }

        return fileComps;
    }

    renderFileList() {
        const fileComps = this.renderFiles();

        let fileListContent;
        let sliceIndex;
        switch (this.state.view) {
            case View.ListColumns:
                sliceIndex = fileComps.length <= 5 ? 5 : Math.floor(fileComps.length / 2);
                fileListContent = <div className="columns is-2 is-variable">
                    <div className="column">{fileComps.slice(0, sliceIndex)}</div>
                    <div className="column">{fileComps.slice(sliceIndex)}</div>
                </div>;
                break;
            default:
                fileListContent = fileComps;
                break;
        }

        const className = `file-list file-list-${this.state.view}`;
        return <div className={className}>{fileListContent}</div>;
    }

    render() {
        return <React.Fragment>
            <div className="level env-tab-level">
                <div className="level-left">
                    <div className="level-item">
                        <nav className="breadcrumb" aria-label="breadcrumbs">
                            <ul>{this.renderBreadcrumbs()}</ul>
                        </nav>
                    </div>
                </div>
                <div className="level-right">
                    <div className="level-item">
                        <div className="dropdown is-right is-hoverable">
                            <div className="dropdown-trigger">
                                <button className="button" aria-haspopup="true" aria-controls="dropdown-menu">
                                    <span>Options</span><Icon name="angle-down"/>
                                </button>
                            </div>
                            <div className="dropdown-menu" id="dropdown-menu" role="menu">
                                <div className="dropdown-content">
                                    {this.renderOptionCheckboxes()}
                                    <hr className="dropdown-divider"/>
                                    {this.renderOptionButtons()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {this.renderFileList()}
        </React.Fragment>;
    }

}

module.exports = BrowseTag;
