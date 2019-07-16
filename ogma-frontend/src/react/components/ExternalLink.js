/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import * as PropTypes from 'prop-types';

import Icon from '../components/Icon';

export default class ExternalLink extends React.Component {

    static propTypes = {
        href: PropTypes.string.isRequired,
        children: PropTypes.any,
    };

    linkClick = event => {
        if (!window.dataManager.isElectron()) return;
        event.preventDefault();
        window.ipcModule.openExternalLink({link: this.props.href});
    };

    render() {
        return <a href={this.props.href} target="_blank" rel="noopener noreferrer" onClick={this.linkClick}>
            {this.props.children}
            <Icon name="external-link-alt" wrapper={false}
                  style={{fontSize: '0.6em', marginLeft: 5, verticalAlign: 'middle'}}/>
        </a>;
    }

}

