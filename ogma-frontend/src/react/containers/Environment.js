/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import path from 'path';
import React from 'react';
import {Helmet} from 'react-helmet';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import {Switch, Route, withRouter, Redirect} from 'react-router-dom';

import TabBrowse from './TabBrowse';
import TabSearch from './TabSearch';
import Tabs from '../components/Tabs';
import TabConfigure from './TabConfigure';
import EnvIcon from '../components/EnvIcon';
import TabManageTags from './TabManageTags';
import {EnvDispatcher} from '../../redux/Action';
import {IndexRoutePath, EnvironmentContext, EnvRoutePaths} from '../../util/typedef';
import TabManageSinks from './TabManageSinks';

const TabOptions = [
    {path: EnvRoutePaths.browse, icon: 'eye', name: 'Browse', passAllRouterProps: true, comp: TabBrowse},
    {path: EnvRoutePaths.search, icon: 'search', name: 'Search', passAllRouterProps: false, comp: TabSearch},
    {path: EnvRoutePaths.tags, icon: 'tags', name: 'Manage tags', passAllRouterProps: false, comp: TabManageTags},
    {path: EnvRoutePaths.sinks, icon: 'filter', name: 'Manage sinks', passAllRouterProps: false, comp: TabManageSinks},
    {path: EnvRoutePaths.configure, icon: 'cog', name: 'Configure', passAllRouterProps: false, comp: TabConfigure},
];
for (const option of TabOptions) option.id = option.path;

class Environment extends React.Component {

    static propTypes = {
        // Props used in redux.connect
        summary: PropTypes.object.isRequired,

        // Props provided by redux.connect
        subRoute: PropTypes.string.isRequired,
    };

    componentDidMount() {
        // Immediately redirect to correct subroute if one isn't specified
        const props = this.props;
        const summary = props.summary;
        const pathName = props.location.pathname;
        const parentPath = props.match.url;
        if (pathName === parentPath) {
            props.history.push(`${parentPath}${props.subRoute}`);
        } else {
            const hash = props.location.hash;
            const routePath = `/${path.relative(parentPath, pathName)}${hash}`;
            EnvDispatcher.updateSubRoute(summary.id, routePath);
        }
    }

    handleRouteChange = routePath => {
        // Remember the current subroute
        const {summary} = this.props;
        if (!routePath.startsWith(EnvRoutePaths.browse)) {
            EnvDispatcher.updateSubRoute(summary.id, routePath);
        }
    };

    renderRoutes() {
        const props = this.props;
        const summary = props.summary;
        const comps = [];
        for (const tab of TabOptions) {
            if (!tab.comp) continue;
            const TabComp = tab.comp;
            const routePath = `${props.match.path}${tab.path}`;

            let renderFunc;
            if (tab.passAllRouterProps) renderFunc = props => <TabComp summary={summary}
                                                                       tabPath={tab.path} {...props}/>;
            else renderFunc = props => <TabComp {...{history: props.history}} summary={summary} tabPath={tab.path}/>;

            comps.push(<Route key={`env-router-${tab.path}`} path={routePath} exact={tab.exact}
                              render={renderFunc}/>);
        }
        return <Switch>{comps}</Switch>;
    }

    render() {
        const summary = this.props.summary;
        if (!summary) return <Redirect to={IndexRoutePath}/>;

        const pageTitle = `${summary.name} collection`;
        return <div className="env force-fullheight">
            <Helmet titleTemplate={`%s | ${pageTitle} | Ogma`}><title>{pageTitle}</title></Helmet>
            <EnvironmentContext.Provider value={summary}>
                <div>
                    <h1 className="title is-size-4 env-title">
                        <EnvIcon color={summary.color} icon={summary.icon}/>
                        &nbsp;&nbsp;{summary.name}
                    </h1>

                    <Tabs options={TabOptions} useLinks={true} basePath={this.props.match.url}
                          className="is-boxed env-tabs"
                          location={this.props.location} onOptionChange={this.handleRouteChange}/>
                </div>

                {this.renderRoutes()}
            </EnvironmentContext.Provider>
        </div>;
    };

}

export default connect((state, ownProps) => {
    const {summary} = ownProps;
    const env = state.envMap[summary.id];
    return {
        subRoute: env ? env.subRoute : null,
    };
})(withRouter(Environment));
