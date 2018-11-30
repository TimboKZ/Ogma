/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const {BulmaSizes} = require('../../../shared/typedef');

class Icon extends React.Component {

    static propTypes = {
        size: PropTypes.oneOf(BulmaSizes),
        name: PropTypes.string.isRequired,
        wrapper: PropTypes.bool,
    };

    static defaultProps = {
        wrapper: true, // Enables Bulma wrapper for the icon
    };

    constructor(props) {
        super(props);
    }

    render() {
        const faIcon = <i className={`fas fa-${this.props.name}`}/>;

        if (this.props.wrapper) {
            let className = 'icon';
            if (this.props.size) className += ` is-${this.props.size}`;
            return <span className={className}>{faIcon}</span>;
        } else {
            return faIcon;
        }
    }

}

module.exports = Icon;
