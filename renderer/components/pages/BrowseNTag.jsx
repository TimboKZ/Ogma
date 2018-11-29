/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const React = require('react');
const {shell} = require('electron');
const {Menu} = require('electron').remote;
const PropTypes = require('prop-types');

const Util = require('../../../main/Util');
const Icon = require('../util/Icon');
const FileEntry = require('../util/FileEntry');

const menu = Menu.buildFromTemplate([
    {label: 'Hello!'},
]);

const Options = {
    FolderFirst: 'folders-first',
    ShowExtensions: 'show-exts',
    ShowHidden: 'show-hidden',
};

class BrowseNTag extends React.Component {

    static prevDir = null;
    static propTypes = {
        envSummary: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            currentDir: this.props.envSummary.root,
            currentFiles: null,
            optionState: {
                [Options.FolderFirst]: true,
                [Options.ShowExtensions]: true,
                [Options.ShowHidden]: true,
            },
        };

        this.optionCheckboxes = [
            {id: Options.FolderFirst, name: 'Show folders first'},
            {id: Options.ShowExtensions, name: 'Show extensions'},
            {id: Options.ShowHidden, name: 'Show hidden files'},
        ];
        this.optionButtons = [
            {icon: 'sync-alt', name: 'Refresh directory', callback: () => null},
            {icon: 'folder-minus', name: 'Clear file cache', callback: () => null},
        ];
        this.optionStateChange = this.optionStateChange.bind(this);
        this.fileEntrySingleClick = this.fileEntrySingleClick.bind(this);
        this.fileEntryDoubleClick = this.fileEntryDoubleClick.bind(this);
    }

    static getDerivedStateFromProps(props, state) {
        const newDirState = BrowseNTag.parseDir(props, state);
        if (newDirState) state = newDirState;



        return state;
    }

    componentWillUnmount() {
        BrowseNTag.prevDir = null;
    }

    static parseDir(props, state) {
        // Do nothing if the directory hasn't changed
        if (BrowseNTag.prevDir && BrowseNTag.prevDir === state.currentDir) return null;

        // Otherwise parse new directory and update the prevDir reference
        BrowseNTag.prevDir = state.currentDir;
        const fileManager = window.dataManager.getFileManager({envId: props.envSummary.id});
        state.currentFiles = fileManager.fetchFiles({dir: state.currentDir});
        return state;
    }

    changeDirTo(newDir) {
        this.setState({currentDir: newDir});
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
        // menu.popup({});
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

        const view = 'list';

        const fileComps = [];
        if (this.state.currentDir !== this.props.envSummary.root) {
            const parentDir = Util.getFileData(path.normalize(path.join(this.state.currentDir, '..')));
            parentDir.name = '..';
            fileComps.push(<FileEntry key={`parent-entry-${parentDir.path}`}
                                      onEntrySingleClick={this.fileEntrySingleClick}
                                      onEntryDoubleClick={this.fileEntryDoubleClick}
                                      file={parentDir} view={view}
                                      showExtension={this.state.optionState[Options.ShowExtensions]}/>);
        }

        // TODO: Sort `files` array

        for (const file of files) {
            fileComps.push(<FileEntry key={`entry-${file.path}`}
                                      onEntrySingleClick={this.fileEntrySingleClick}
                                      onEntryDoubleClick={this.fileEntryDoubleClick}
                                      file={file} view={view}
                                      showExtension={this.state.optionState[Options.ShowExtensions]}/>);
        }

        return fileComps;
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

            <div className="file-list">
                {this.renderFiles()}
            </div>
        </React.Fragment>;
    }

}

module.exports = BrowseNTag;
