/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const Promise = require('bluebird');
const PropTypes = require('prop-types');
const {withRouter} = require('react-router-dom');

const {HomeRoutePath} = require('../../../shared/typedef');
const {StateProps} = require('../../util/GlobalState');
const Util = require('../../../shared/Util');
const Modal = require('../../util/Modal');
const Icon = require('../helpers/Icon');
const {TextLoader} = require('../helpers/TextLoader');

class Configure extends React.Component {

    static propTypes = {
        envSummary: PropTypes.object.isRequired,
        history: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.state = {
            dbFileSize: TextLoader.init(),
        };
    }

    componentDidMount() {
        const summary = this.props.envSummary;
        Promise.resolve(Util.getFriendlyFileSize({filePath: summary.dbFile}))
            .then(friendlySize => this.setState({dbFileSize: TextLoader.finish(friendlySize)}))
            .catch(error => {
                // TODO: Replace this with better error
                console.log(error);
                this.setState({dbFileSize: TextLoader.fail()});
            });
    }

    changeIconOrCodeClick() {
    }

    changeColourClick() {
    }

    hideButtonClick() {
        const summary = this.props.envSummary;

        Modal.confirm({
            title: `Hide ${summary.name} environment?`,
            text: 'You can restore it later via Home > Settings.',
            confirmButtonText: 'Yes, hide it',
            cancelButtonText: 'No, cancel',
        }).then(result => {
            if (!result.value) return;

            Promise.resolve()
                .then(() => window.dataManager.ipcModule.hideEnv({id: summary.id}))
                .then(() => window.dataManager._refreshEnvSummaries())
                .then(() => {
                    this.props.history.push(HomeRoutePath);
                    window.globalState.notify(StateProps.EnvSummariesChanged);
                })
                .catch(window.errorHandler.handle);
        });
    }

    renderStatistics() {
        const summary = this.props.envSummary;
        const stats = [
            {name: 'Environment ID', value: <code>{summary.id}</code>},
            {name: 'Environment Root', value: <code>{summary.root}</code>},
            {name: 'DB File', value: <code>{summary.dbFile}</code>},
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
            <thead>
            <tr>
                <th colSpan={2}>Info & statistics:</th>
            </tr>
            </thead>
            <tbody>{comps}</tbody>
        </table>;
    }

    render() {
        const summary = this.props.envSummary;
        const colourPreview = <span className="colour-preview" style={{backgroundColor: summary.colour}}/>;

        return <div>
            {this.renderStatistics()}

            <div className="columns">
                <div className="column is-narrow">
                    <button className="button is-info is-pulled-left" onClick={() => this.changeIconOrCodeClick()}>
                        <Icon name="magic"/>
                        <span>Change environment icon or code</span>
                    </button>
                </div>
                <div className="column">
                    Your current environment colour is <code>{summary.colour}</code>, and it looks like
                    this: {colourPreview} . This colour is used to highlight different elements of the environment,
                    namely its icon in the environment selector on the left.
                </div>
            </div>

            <hr/>

            <div className="columns">
                <div className="column is-narrow">
                    <button className="button is-info is-pulled-left" onClick={() => this.changeColourClick()}>
                        <Icon name="palette"/>
                        <span>Change environment colour</span>
                    </button>
                </div>
                <div className="column">
                    Your current environment colour is <code>{summary.colour}</code>, and it looks like
                    this: {colourPreview} . This colour is used to highlight different elements of the environment,
                    namely its icon in the environment selector on the left.
                </div>
            </div>

            <hr/>

            <div className="columns">
                <div className="column is-narrow">
                    <button className="button is-danger is-pulled-left" onClick={() => this.hideButtonClick()}>
                        <Icon name="eye-slash"/>
                        <span>Hide this environment</span>
                    </button>
                </div>
                <div className="column">
                    Pressing this button will hide the <strong>{summary.name}</strong> from the environment selector on
                    the left. Once hidden, the environment can be restored (or deleted completely) by going
                    to <strong>Home &gt; Settings</strong>.
                </div>
            </div>

            <div className="is-clearfix"/>
        </div>;
    }

}

module.exports = withRouter(Configure);
