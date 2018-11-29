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
        view: PropTypes.oneOf(ViewSlugs).isRequired,
        showExtension: PropTypes.bool.isRequired,
    };

    constructor(props) {
        super(props);

        this.clickCount = 0;
        this.singleClickTimer = '';
    }

    getIconName() {
        const file = this.props.file;
        if (file.isDirectory) return DefaultFolderIcon;

        const icon = FileIcons[file.ext];
        if (icon) return icon;
        else return DefaultFileIcon;
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

    renderIcon() {
        const externalIcon = FileIconsJs.getClassWithColor(this.props.file.base);
        if (externalIcon) return <i className={externalIcon}/>;

        return <Icon name={this.getIconName()} wrapper={false}/>;

    }

    renderFileName() {
        const file = this.props.file;

        let extComp;
        if (this.props.showExtension && file.name !== '..') {
            if (file.isDirectory) extComp = ' folder';
            else extComp = `.${file.ext}`;
        }

        return <span>
            <strong>{this.props.file.name}</strong>
            <span className="has-text-grey">{extComp}</span>
        </span>;
    }

    render() {
        const className = `file-entry file-entry-${this.props.view}`;
        return <div className={className} onClick={() => this.entryClick()}>
            <div className="file-entry-icon">{this.renderIcon()}</div>
            <div className="file-entry-name">{this.renderFileName()}</div>
        </div>;
    }

}

module.exports = FileEntry;
