/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const {NavLink} = require('react-router-dom');
const promiseIpc = require('electron-promise-ipc');

const Icon = require('./Icon');

class EnvSelector extends React.Component {

    static propTypes = {
        envs: PropTypes.array,
        activeEnv: PropTypes.string,
    };

    static defaultProps = {
        envs: [],
        activeEnv: null,
    };

    constructor(props) {
        super(props);

        this.createEnvClick = this.createEnvClick.bind(this);
    }

    createEnvClick() {
        promiseIpc.send('createEnv');
    }

    renderEnvButtons() {
        const envs = this.props.envs;
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
                        style={{backgroundColor: env.background}}><span>{symbol}</span></NavLink>
                </div>
            );
        }
        return comps;
    }

    render() {
        return (
            <div className="env-selector">

                <div className="env-button-wrapper tooltip is-tooltip-right" data-tooltip="Ogma home">
                    <NavLink
                        to="/"
                        exact
                        className="env-button home-env"
                        activeClassName="env-active"/>
                </div>

                {this.renderEnvButtons()}

                <div className="env-button-wrapper tooltip is-tooltip-right" data-tooltip="Add a new environment">
                    <a className="env-button add-env" onClick={this.createEnvClick}>
                        <Icon name="plus" bulmaWrapper={false}/>
                    </a>
                </div>

            </div>
        );
    }

}

module.exports = EnvSelector;
