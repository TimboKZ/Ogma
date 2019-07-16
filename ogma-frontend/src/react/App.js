/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import _ from 'lodash';
import React from 'react';
import equal from 'fast-deep-equal';
import {Helmet} from 'react-helmet';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Environment from './containers/Environment';
import AppSettings from './containers/AppSettings';
import AppNotFound from './containers/AppNotFound';
import AppDashboard from './containers/AppDashboard';

class App extends React.Component {

    static propTypes = {
        // Props provided by redux.connect
        summaries: PropTypes.array.isRequired,
    };

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !equal(this.props, nextProps);
    }

    render() {
        const {summaries} = this.props;
        const envRoutes = new Array(summaries.length);
        for (let i = 0; i < summaries.length; ++i) {
            const summary = summaries[i];
            const routePath = `/env/${summary.slug}`;
            envRoutes[i] = <Route key={summary.id} path={routePath}
                                  render={props => <Environment {...props} summary={summary}/>}/>;
        }

        return (
            <Router>
                <Helmet titleTemplate="%s | Ogma" defaultTite="Ogma"/>
                <div className="columns force-fullheight">
                    <div className="column is-narrow"><Sidebar summaries={summaries}/></div>
                    <div className="column force-fullheight">
                        <div className="box no-border force-fullheight">
                            <Switch>
                                <Route path="/" exact component={AppDashboard}/>
                                <Route path="/settings" component={AppSettings}/>
                                {envRoutes}
                                <Route component={AppNotFound}/>
                            </Switch>
                        </div>
                    </div>
                </div>
            </Router>
        );
    }
}

export default connect(state => ({
    summaries: _.map(state.envMap, e => e.summary),
}))(App);
