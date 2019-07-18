/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import ExactTrie from 'exact-trie';
import {Helmet} from 'react-helmet';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import {NotificationManager} from 'react-notifications';

import EnvIcon from '../components/EnvIcon';
import ErrorHandler from '../../util/ErrorHandler';
import Icon from '../components/Icon';
import {NavLink} from 'react-router-dom';

const BrowserIcons = {
    'b:chrome': ['Chrome'],
    'b:facebook': ['Facebook'],
    'b:firefox': ['Firefox'],
    'b:opera': ['Opera'],
    'b:safari': ['Safari', 'Mobile Safari'],
};
const BrowserIconTrie = new ExactTrie({ignoreCase: false});
for (const iconName in BrowserIcons) {
    BrowserIconTrie.putAll(BrowserIcons[iconName], iconName);
}

class AppDashboard extends React.Component {

    static propTypes = {
        // Props provided by redux.connect
        client: PropTypes.object.isRequired,
        connections: PropTypes.arrayOf(PropTypes.object).isRequired,
    };

    handleCreateEnvClick = () => {
        if (!window.dataManager.isLocalClient()) {
            NotificationManager.warning('Only local clients can create new collections.');
            return;
        }
        NotificationManager.info('Check other windows on your computer.',
            'The "create new collection" dialog is now open.');
        window.ipcModule.openCollection()
            .then(summary => {
                if (!summary) return null;

                const url = `/env/${summary.slug}`;
                this.props.history.push(url);
            })
            .catch(ErrorHandler.handleMiscError);
    };

    renderCollections() {
        const {summaries} = this.props;
        const comps = new Array(summaries.length);
        for (let i = 0; i < summaries.length; ++i) {
            const summary = summaries[i];
            const key = `dashboard-env-${summary.id}`;
            const url = `/env/${summary.slug}`;
            const style = {
                backgroundColor: summary.color,
            };
            comps[i] = <NavLink to={url} className="env-list-item env-list-item-env" key={key} style={style}>
                <div className="env-list-item-content">
                    <div className="env-list-item-icon"><Icon name={summary.icon}/></div>
                    <div className="env-list-item-name">{summary.name}</div>
                </div>
            </NavLink>;
        }
        return <div className="env-list">
            {comps}
            <button className="env-list-item env-list-item-button" onClick={this.handleCreateEnvClick}>
                <div className="env-list-item-content">
                    <div className="env-list-item-icon"><Icon name="plus-square"/></div>
                    <div className="env-list-item-name">Create collection</div>
                </div>
            </button>
        </div>;
    }

    renderActiveConnections() {
        const {client, connections} = this.props;

        const trs = new Array(connections.length);
        for (let i = 0; i < connections.length; ++i) {
            const conn = connections[i];
            const {os, browser} = conn.userAgent;
            const isSelf = conn.id === client.id;
            const className = isSelf ? 'active-connection' : '';

            const browserIcon = BrowserIconTrie.getWithCheckpoints(browser.name, ' ');
            trs[i] = <tr key={`connection-${conn.id}`}>
                <td>
                    <span className={className}>
                        {!!browserIcon && <Icon name={browserIcon}/>} <strong>{browser.name}</strong> on {os.name}
                    </span>
                    {isSelf && <span className="has-text-grey-light"> (this is you)</span>}
                </td>
                <td>{conn.ip}</td>
                <td>
                    <Icon name={conn.localClient ? 'laptop' : 'globe'}/>
                    &nbsp;&nbsp;{conn.localClient ? 'Local' : 'Web'} client
                </td>
            </tr>;
        }

        return <table className="table is-striped is-bordered">
            <thead>
            <tr>
                <th>Device</th>
                <th>IP</th>
                <th>Type</th>
            </tr>
            </thead>
            <tbody>{trs}</tbody>
        </table>;
    }

    render() {
        return <div className="dashboard">
            <Helmet><title>Dashboard</title></Helmet>
            <h1 className="title is-size-4"><EnvIcon icon="tachometer-alt"/>&nbsp;&nbsp; Dashboard</h1>

            <h1 className="title is-size-5">Your collections</h1>
            {this.renderCollections()}

            <br/>

            <h1 className="title is-size-5">Active connections</h1>
            {this.renderActiveConnections()}
        </div>;
    };

}

export default connect(state => {
    const {client, envIds, envMap} = state;
    return {
        client,
        summaries: envIds.map(id => envMap[id].summary),
        connections: Object.values(state.connectionMap),
    };
})(AppDashboard);
