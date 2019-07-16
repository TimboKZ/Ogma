/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import * as PropTypes from 'prop-types';

import Icon from './Icon';

export default class EnvIcon extends React.Component {

    static propTypes = {
        color: PropTypes.string,
        background: PropTypes.bool,
        icon: PropTypes.string.isRequired,
    };

    static defaultProps = {
        background: true,
    };

    render() {
        const style = {};
        if (this.props.background) {
            style.color = '#fff';
            style.backgroundColor = this.props.color || '#999';
        } else {
            style.color = this.props.color;
        }

        return <span className="env-icon" style={style}><Icon name={this.props.icon}/></span>;
    }

}

