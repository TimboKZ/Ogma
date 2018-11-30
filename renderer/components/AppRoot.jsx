/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const {Route, HashRouter} = require('react-router-dom');

const EnvSelector = require('./util/EnvSelector');
const HomePage = require('./pages/HomePage');
const EnvRoot = require('./pages/EnvRoot');

class AppRoot extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            selectorEnvs: [],
        };
    }

    render() {
        const envIds = window.dataManager.getEnvIds();
        return (
            <HashRouter>
                <React.Fragment>
                    <EnvSelector envs={this.state.selectorEnvs}/>
                    <div className="page">
                        <Route path="/home" component={HomePage}/>
                        <Route path={`/envs/:envId(${envIds.join('|')})`} component={EnvRoot}/>
                    </div>
                </React.Fragment>
            </HashRouter>
        );
    }

}

module.exports = AppRoot;
