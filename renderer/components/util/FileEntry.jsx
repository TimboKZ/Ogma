/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const FileIconsJs = require('file-icons-js');

const Icon = require('../util/Icon');
const {Views, ViewSlugs} = require('../util/ViewPicker');

// Prepare icon name for different file types
const ExitFolderIcon = 'level-up-alt';
const DefaultFolderIcon = 'folder';
const DefaultFileIcon = 'file';
const IconsToExtensions = {
    'film': ['avi', 'mp4', 'mkv'],
    'file-archive': ['zip', 'rar', 'tar', 'tar.gz'],
    'file-image': ['png', 'jpg', 'jpeg'],
};
const FileIcons = {};
for (const icon in IconsToExtensions) {
    for (const ext of IconsToExtensions[icon]) {
        FileIcons[ext] = icon;
    }
}

class FileEntry extends React.Component {

    static propTypes = {
        onEntrySingleClick: PropTypes.func.isRequired,
        onEntryDoubleClick: PropTypes.func.isRequired,
        file: PropTypes.object.isRequired,
        view: PropTypes.oneOf(ViewSlugs),
        collapseLongNames: PropTypes.bool,
        showExtension: PropTypes.bool,
    };

    static defaultProps = {
        view: Views.List,
        collapseLongNames: false,
        showExtension: true,
    };

    constructor(props) {
        super(props);
        this.state = {
            thumbPath: null,
        };

        this.clickCount = 0;
        this.singleClickTimer = '';
    }

    componentDidMount() {
        const file = this.props.file;
        if (file.isFile) {
            window.dataManager.getThumbnail({filePath: file.path})
                .then(thumbPath => this.setState({thumbPath}))
                .catch(error => console.log(error));
        }
    }

    entryClick() {
        this.clickCount++;
        if (this.clickCount === 1) {
            this.singleClickTimer = setTimeout(() => {
                this.clickCount = 0;
                this.props.onEntrySingleClick(this.props.file);
            }, 300);
        } else if (this.clickCount === 2) {
            clearTimeout(this.singleClickTimer);
            this.clickCount = 0;
            this.props.onEntryDoubleClick(this.props.file);
        }
    }

    getIconName() {
        const file = this.props.file;
        if (file.isDirectory) {
            if (file.name === '..') return ExitFolderIcon;
            return DefaultFolderIcon;
        }

        const icon = FileIcons[file.ext];
        if (icon) return icon;
        else return DefaultFileIcon;
    }

    renderIcon() {
        const file = this.props.file;

        const externalIcon = FileIconsJs.getClassWithColor(file.base);
        if (externalIcon) return <i className={externalIcon}/>;
        return <Icon name={this.getIconName()} wrapper={false}/>;

    }

    renderFileName() {
        const file = this.props.file;

        // Prepare file name
        let name = this.props.file.name;
        if (this.props.collapseLongNames) {
            const length = name.length;
            if (length > 70) name = `${name.slice(0, 30)}<span>...</span>${name.slice(length - 20)}`;
        }

        // Prepare file extension
        let extComp;
        let extClass = 'file-entry-name-info';
        if (this.props.showExtension) {
            if (file.isDirectory) {
                extComp = file.name === '..' ? '(go back)' : '(folder)';
            } else {
                extComp = file.ext ? `.${file.ext}` : ' (no extension)';
                if (file.ext) extClass = 'file-entry-name-ext';
            }
        }

        return <span>
            <span className="file-entry-name-base" dangerouslySetInnerHTML={{__html: name}}/>
            <span className={extClass}>{extComp}</span>
        </span>;
    }

    render() {
        const file = this.props.file;

        let iconComp;
        if (this.state.thumbPath) {
            iconComp = <div className="file-entry-thumb"><img alt={file.name} src={this.state.thumbPath}/></div>;
        } else {
            iconComp = <div className="file-entry-icon">{this.renderIcon()}</div>;
        }

        const className = `file-entry file-entry-${this.props.view}`;
        return <div className={className} onClick={() => this.entryClick()}>
            {iconComp}
            <div className="file-entry-name">{this.renderFileName()}</div>
        </div>;
    }

}

module.exports = FileEntry;
