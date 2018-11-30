/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const shell = require('electron').shell;
const PropTypes = require('prop-types');

const Icon = require('../helpers/Icon');

class ExternalLink extends React.Component {

    static propTypes = {
        href: PropTypes.string.isRequired,
        children: PropTypes.any,
    };

    constructor(props) {
        super(props);
    }

    linkClick() {
        shell.openExternal(this.props.href);
    }

    render() {
        return <a onClick={() => this.linkClick()}>
            {this.props.children}
            <Icon name="external-link-alt" wrapper={false} style={{fontSize: '0.77em', marginLeft: '4px'}}/>
        </a>;
    }

}

module.exports = ExternalLink;
