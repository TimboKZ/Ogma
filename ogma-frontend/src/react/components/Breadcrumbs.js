/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import * as PropTypes from 'prop-types';
import Icon from './Icon';

export default class Breadcrumbs extends React.Component {

    static propTypes = {
        options: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            title: PropTypes.string,
            icon: PropTypes.string,
            onClick: PropTypes.func,
            isActive: PropTypes.func,
        })).isRequired,
        lastIsActive: PropTypes.bool,
    };

    static defaultProps = {
        options: [
            {id: 1, title: 'Breadcrumb #1', onClick: id => console.log(`Breadcrumb #${id} clicked.`)},
            {id: 2, title: 'Breadcrumb #2', onClick: id => console.log(`Breadcrumb #${id} clicked.`)},
        ],
        lastIsActive: true,
    };

    constructor(props) {
        super(props);

        this.state = {options: this.props.options};
    }

    static getDerivedStateFromProps(props) {
        return {
            options: props.options,
        };
    }

    renderBreadcrumbs() {
        const options = this.state.options;
        const comps = new Array(options.length);
        for (let i = 0; i < options.length; ++i) {
            const option = options[i];

            let className = '';
            if (option.isActive || (this.props.lastIsActive && i === options.length - 1)) {
                className = 'is-active';
            }

            const key = `${option.id}-${i}`;
            const onClick = option.onClick ? () => option.onClick(option.id) : null;
            comps[i] = <li key={key} className={className}>
                <button onClick={onClick}>
                    {option.icon && <Icon name={option.icon}/>}
                    {option.title}
                </button>
            </li>;
        }
        return comps;
    }

    render() {
        return <nav className="breadcrumb" aria-label="breadcrumbs">
            <ul>
                {this.renderBreadcrumbs()}
            </ul>
        </nav>;
    };

}