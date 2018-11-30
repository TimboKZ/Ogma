/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const Promise = require('bluebird');
const PropTypes = require('prop-types');

const Util = require('../../../shared/Util');
const {TextLoader} = require('../util/TextLoader');

class Configure extends React.Component {

    static propTypes = {
        envSummary: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            dbFileSize: TextLoader.init(),
        };
    }

    componentDidMount() {
        const summary = this.props.envSummary;
        Promise.resolve(Util.getFriendlyFileSize({filePath: summary.dbFilePath}))
            .then(friendlySize => this.setState({dbFileSize: TextLoader.finish(friendlySize)}))
            .catch(error => {
                // TODO: Replace this with better error
                console.log(error);
                this.setState({dbFileSize: TextLoader.fail()});
            });
    }

    renderStatistics() {
        const summary = this.props.envSummary;
        const stats = [
            {name: 'Environment ID', value: <code>{summary.id}</code>},
            {name: 'Environment Root', value: <code>{summary.root}</code>},
            {name: 'DB File', value: <code>{summary.dbFilePath}</code>},
            {
                name: 'DB File Size',
                value: <TextLoader property={this.state.dbFileSize}/>,
            },
        ];

        const comps = new Array(stats.length);
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const key = `stat-${stat.name}`;
            comps[i] = <tr key={key}>
                <td>{stat.name}</td>
                <td>{stat.value}</td>
            </tr>;
        }
        return <table className="table is-pulled-right is-bordered">
            <thead><tr><th colSpan={2}>Info & statistics:</th></tr></thead>
            <tbody>{comps}</tbody>
        </table>;
    }

    render() {
        return <div>
            {this.renderStatistics()}
            <div className="is-clearfix"/>
        </div>;
    }

}

module.exports = Configure;
