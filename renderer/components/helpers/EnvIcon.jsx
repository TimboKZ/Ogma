/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const Icon = require('../helpers/Icon');

class EnvIcon extends React.Component {

    static propTypes = {
        icon: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
    }

    render() {
        const inputIcon = this.props.icon;

        let icon;
        let symbol;
        if (inputIcon && !inputIcon.startsWith('_')) icon = inputIcon;
        else symbol = inputIcon.replace(/^_/, '');

        if (icon) return <span className="env-icon"><Icon name={icon}/></span>;
        return <span className="env-symbol">{symbol}</span>;
    }

}

module.exports = EnvIcon;
