/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

class FileEntry extends React.Component {

    static propTypes = {
        file: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <h1>{this.props.file.name}</h1>;
    }

}

module.exports = FileEntry;
