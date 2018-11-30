/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const {withRouter, Switch, Route, Redirect} = require('react-router-dom');

const Modal = require('../util/Modal');
const Util = require('../../shared/Util');
const {StateProps} = require('../util/GlobalState');
const {HomeRoutePath} = require('../../shared/typedef');
const EnvSelector = require('./helpers/EnvSelector');
const HomePage = require('./containers/HomePage');
const EnvRoot = require('./containers/EnvRoot');

class AppRoot extends React.Component {

    static propTypes = {
        history: PropTypes.any,
    };

    constructor(props) {
        super(props);
        this.state = {
            envIds: window.dataManager.getEnvIds(),
            envSummaries: window.dataManager.getEnvSummaries(),
        };

        this.globalStateChange = this.globalStateChange.bind(this);
    }
    componentDidMount() {
        window.globalState.addListener(StateProps.EnvSummariesChanged, this.globalStateChange, false);
    }

    componentWillUnmount() {
        window.globalState.addListener(StateProps.EnvSummariesChanged, this.globalStateChange);
    }


    globalStateChange(propName) {
        if (propName !== StateProps.EnvSummariesChanged) return;
        this.setState({
            envIds: window.dataManager.getEnvIds(),
            envSummaries: window.dataManager.getEnvSummaries(),
        });
    }

    createEnvClick() {
        Modal.showButtonless({
            title: 'Creating environment...',
            text: 'Use the file picker window to choose the environment root.',
        })
            .then(() => {
                // Delay the 'createEnv' call a little bit to make sure the modal has time to render
                Util.delayFunc(window.dataManager.ipcModule.createEnv, 10)
                    .then(envId => {
                        // Check if user cancelled the operation or if there was an error
                        if (!envId) return;

                        return window.dataManager._refreshEnvSummaries()
                            .then(() => {
                                window.globalState.notify(StateProps.EnvSummariesChanged);
                                this.props.history.push(`/envs/${envId}`);
                            })
                            .catch(window.errorHandler.handle);
                    })
                    .then(() => Modal.hide());
            });
    }

    render() {
        return (
            <React.Fragment>
                <EnvSelector envSummaries={this.state.envSummaries}
                             onCreateEnvClick={() => this.createEnvClick()}/>
                <div className="page">
                    <Switch>
                        <Route path="/home" component={HomePage}/>
                        <Route path={`/envs/:envId(${this.state.envIds.join('|')})`} component={EnvRoot}/>
                        <Route><Redirect to={HomeRoutePath}/></Route>
                    </Switch>
                </div>
            </React.Fragment>
        );
    }

}

module.exports = withRouter(AppRoot);
module.exports.HomePageHash = HomeRoutePath;
