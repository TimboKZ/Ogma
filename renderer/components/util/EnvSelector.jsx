/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const {NavLink} = require('react-router-dom');
const promiseIpc = require('electron-promise-ipc');

const Icon = require('./Icon');

class EnvSelector extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            envSummaries: [],
        };

        this.createEnvClick = this.createEnvClick.bind(this);
    }

    componentDidMount() {
        window.dataManager.getEnvSummaries()
            .then(envSummaries => this.setState({envSummaries}));
    }

    createEnvClick() {
        promiseIpc.send('createEnv');
    }

    renderEnvButtons() {
        const envs = this.state.envSummaries;
        const comps = new Array(envs.length);
        for (let i = 0; i < comps.length; i++) {
            const env = envs[i];
            const symbol = env.name.toUpperCase().charAt(0);
            comps[i] = (
                <div
                    key={`env-${env.id}`}
                    className="env-button-wrapper tooltip is-tooltip-right"
                    data-tooltip={env.name}>
                    <NavLink
                        to={`/envs/${env.id}`}
                        className="env-button"
                        activeClassName="env-active"
                        style={{backgroundColor: env.colour}}><span>{symbol}</span></NavLink>
                </div>
            );
        }
        return comps;
    }

    render() {
        return (
            <div className="env-selector">

                <div className="env-button-wrapper tooltip is-tooltip-right" data-tooltip="Home">
                    <NavLink
                        to="/"
                        exact
                        className="env-button home-env"
                        activeClassName="env-active"/>
                </div>

                {this.renderEnvButtons()}

                <div className="env-button-wrapper tooltip is-tooltip-right" data-tooltip="Add a new environment">
                    <a className="env-button add-env" onClick={this.createEnvClick}>
                        <Icon name="plus" wrapper={false}/>
                    </a>
                </div>

            </div>
        );
    }

}

module.exports = EnvSelector;
