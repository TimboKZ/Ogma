/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const {NavLink} = require('react-router-dom');

const Icon = require('./Icon');
const EnvIcon = require('./EnvIcon');

class EnvSelector extends React.Component {

    static propTypes = {
        envSummaries: PropTypes.array.isRequired,
        onCreateEnvClick: PropTypes.func.isRequired,
    };

    renderEnvButtons() {
        const envs = this.props.envSummaries;
        const comps = new Array(envs.length);
        for (let i = 0; i < comps.length; i++) {
            const summary = envs[i];

            comps[i] = (
                <div
                    key={`env-${summary.id}`}
                    className="env-button-wrapper tooltip is-tooltip-right"
                    data-tooltip={summary.name}>
                    <NavLink
                        to={`/envs/${summary.id}`}
                        className="env-button"
                        activeClassName="env-active"
                        style={{backgroundColor: summary.colour}}>
                        <EnvIcon icon={summary.icon}/>
                    </NavLink>
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
                        to="/home"
                        className="env-button home-env"
                        activeClassName="env-active"/>
                </div>

                {this.renderEnvButtons()}

                <div className="env-button-wrapper tooltip is-tooltip-right" data-tooltip="Add a new environment">
                    <a className="env-button add-env" onClick={this.props.onCreateEnvClick}>
                        <span className="env-icon"><Icon name="plus" wrapper={false}/></span>
                    </a>
                </div>

            </div>
        );
    }

}

module.exports = EnvSelector;
