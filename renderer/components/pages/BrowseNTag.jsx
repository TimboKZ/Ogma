/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const FileEntry = require('../util/FileEntry');

class BrowseNTag extends React.Component {

    static propTypes = {
        envSummary: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            currentDir: this.props.envSummary.root,
            currentFiles: null,
        };

    }

    static getDerivedStateFromProps(props, state) {
        return BrowseNTag.parseDir(props, state);
    }

    static componentWillUnmount() {
        BrowseNTag.prevDir = null;
    }

    static prevDir = null;

    static parseDir(props, state) {
        // Do nothing if the directory hasn't changed
        if (BrowseNTag.prevDir && BrowseNTag.prevDir === state.currentDir) return null;

        // Otherwise parse new directory and update the prevDir reference
        BrowseNTag.prevDir = state.currentDir;
        const fileManager = window.dataManager.getFileManager({envId: props.envSummary.id});
        state.currentFiles = fileManager.fetchFiles({dir: state.currentDir});
        return state;
    }

    renderBreadcrumbs() {
        return <h1>Hello!</h1>;
    }

    renderFiles() {
        const files = this.state.currentFiles;
        if (!files) return <h1>Loading...</h1>;

        const fileComps = [];
        for (const file of files) {
            fileComps.push(<FileEntry key={`entry-${file.path}`} file={file}/>);
        }
        return fileComps;
    }

    render() {
        return <React.Fragment>
            <div className="level">
                <div className="level-left">
                    <div className="level-item">{this.renderBreadcrumbs()}</div>
                </div>
                <div className="level-right">
                    <div className="level-item">
                    </div>
                </div>
            </div>

            {this.renderFiles()}
        </React.Fragment>;
    }

}

module.exports = BrowseNTag;
