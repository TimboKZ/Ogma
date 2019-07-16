/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import React from 'react';
import c from 'classnames';
import * as PropTypes from 'prop-types';

import Icon from '../Icon';
import {FileView, SortOrder, ExplorerOptions as Options} from '../../../util/typedef';
import Checkbox from '../Checkbox';

const SortOrderOptions = [
    {id: SortOrder.NameAsc, icon: 'sort-alpha-down', name: 'Names ascending'},
    {id: SortOrder.NameDesc, icon: 'sort-alpha-up', name: 'Names descending'},
];

const FileViewOptions = [
    {id: FileView.List, icon: 'list-ul', name: 'List view'},
    {id: FileView.MediumThumb, icon: 'th', name: 'Medium thumbnails'},
    {id: FileView.LargeThumb, icon: 'th-large', name: 'Large thumbnails'},
];

export default class FileStatusBar extends React.Component {

    static propTypes = {
        // Props passed by parent
        createFolder: PropTypes.func,
        filter: PropTypes.string.isRequired,
        onFilerChange: PropTypes.func.isRequired,
        fileCount: PropTypes.number.isRequired,
        hiddenCount: PropTypes.number.isRequired,
        selectionSize: PropTypes.number.isRequired,
        loadingCount: PropTypes.number.isRequired,
        options: PropTypes.object.isRequired,
        onOptionChange: PropTypes.func.isRequired,
    };

    static defaultProps = {
        filter: '',
    };

    constructor(props) {
        super(props);

        this.state = {
            filter: props.filter,
        };

        this.optionCheckboxes = [
            {id: Options.CollapseLongNames, name: 'Collapse long names'},
            {id: Options.FoldersFirst, name: 'Show folders first'},
            {id: Options.ShowExtensions, name: 'Show extensions'},
            {id: Options.ShowHidden, name: 'Show hidden files'},
            {id: Options.ConfirmDeletions, name: 'Confirm deletions'},
        ];

        if (props.onFilerChange) this.debouncedOnFilterChange = _.debounce(props.onFilerChange, 200);
    }

    handlerFilterChange = filter => {
        this.setState({filter});
        if (this.debouncedOnFilterChange) this.debouncedOnFilterChange(filter);
    };

    renderButtons(key, options, current, onClick) {
        const buttons = new Array(options.length);
        for (let i = 0; i < buttons.length; ++i) {
            const option = options[i];
            const active = option.id === current;
            const props = {
                key: `bar-${key}-${option.id}`,
                onClick: () => onClick(option.id),
                className: c({
                    'button': true,
                    'toggle-button': true,
                    'is-info': active,
                    'is-outlined': active,
                    'tooltip': option.name,
                }),
                'data-tooltip': option.name,
            };
            buttons[i] = <button {...props}><Icon name={option.icon}/></button>;
        }
        return <div className="level-item">
            {buttons}
        </div>;
    }

    renderButton(icon, active, onClick, tooltip = '') {
        const buttonClasses = c({
            'button': true,
            'is-info': active,
            'is-outlined': active,
            'tooltip': tooltip,
        });
        return <div className="level-item">
            <button className={buttonClasses} onClick={() => onClick(!active)} data-tooltip={tooltip}>
                <Icon name={icon}/>
            </button>
        </div>;
    }

    render() {
        const {
            fileCount, hiddenCount, selectionSize, loadingCount, options, onOptionChange, createFolder,
        } = this.props;
        const {filter} = this.state;

        const bracketCounts = [];
        if (hiddenCount !== 0) bracketCounts.push(`${hiddenCount} hidden`);
        if (loadingCount !== 0) bracketCounts.push(`${loadingCount} loading`);

        const checkboxes = this.optionCheckboxes;
        const comps = new Array(checkboxes.length);
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = checkboxes[i];
            const key = `checkbox-${checkbox.id}`;
            comps[i] = <div key={key} className="dropdown-item">
                <div className="field">
                    <Checkbox id={checkbox.id} name={checkbox.name} checked={options[checkbox.id]}
                              onChange={onOptionChange}/>
                </div>
            </div>;
        }

        const prepHandler = id => (value => onOptionChange(id, value));

        return <div className="status-bar">
            <nav className="level">
                <div className="level-left">
                    <div className="level-item">
                        <div className="field has-addons">
                            <div className="control has-icons-left has-icons-right">
                                <input className="input" type="text" placeholder={`Search in files`} value={filter}
                                       onChange={event => this.handlerFilterChange(event.target.value)}/>
                                <span className="icon is-left"><Icon name="search" wrapper={false}/></span>
                            </div>
                        </div>
                    </div>

                    {fileCount !== -1 &&
                    <div className="level-item"><p>
                        {fileCount} file{fileCount !== 1 ? 's' : ''}
                        {bracketCounts.length !== 0 &&
                        <span className="loading-count"> ({bracketCounts.join(', ')})</span>}
                    </p></div>}

                    {selectionSize !== 0 &&
                    <div className="level-item selection-count"><p>{selectionSize} selected</p></div>}
                </div>

                <div className="level-right">
                    {!!createFolder && this.renderButton('folder-plus', false,
                        createFolder, 'Create folder')}
                    {this.renderButtons('order', SortOrderOptions, options[Options.SortOrder],
                        prepHandler(Options.SortOrder))}
                    {this.renderButtons('view', FileViewOptions, options[Options.FileView],
                        prepHandler(Options.FileView))}
                    {this.renderButton('eye', options[Options.ShowPreview],
                        prepHandler(Options.ShowPreview), 'Show file preview')}

                    <div className="level-item">
                        <div className="dropdown is-right is-hoverable">
                            <div className="dropdown-trigger">
                                <button className="button" aria-haspopup="true" aria-controls="dropdown-menu">
                                    <span>Options</span><Icon name="angle-down" size="small"/>
                                </button>
                            </div>
                            <div className="dropdown-menu" id="dropdown-menu" role="menu">
                                <div className="dropdown-content">{comps}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </div>;
    };

}