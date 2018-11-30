/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const Promise = require('bluebird');
const PropTypes = require('prop-types');
const {GithubPicker} = require('react-color');
const {withRouter} = require('react-router-dom');

const {EnvProperty, HomeRoutePath, Colours} = require('../../../shared/typedef');
const {StateProps} = require('../../util/GlobalState');
const Util = require('../../../shared/Util');
const Modal = require('../../util/Modal');
const Icon = require('../helpers/Icon');
const EnvIcon = require('../helpers/EnvIcon');
const ExternalLink = require('../helpers/ExternalLink');
const {TextLoader} = require('../helpers/TextLoader');

class Configure extends React.Component {

    static propTypes = {
        envSummary: PropTypes.object.isRequired,
        history: PropTypes.any,
    };

    constructor(props) {
        super(props);
        this.state = {
            iconTextValue: this.props.envSummary.icon,
            dbFileSize: TextLoader.init(),
        };

        this.mounted = false;
    }

    componentDidMount() {
        this.mounted = true;
        const summary = this.props.envSummary;
        Promise.resolve(Util.getFriendlyFileSize({filePath: summary.dbFile}))
            .then(friendlySize => this.setState({dbFileSize: TextLoader.finish(friendlySize)}))
            .catch(error => {
                window.errorHandler.handle(error);
                this.setState({dbFileSize: TextLoader.fail()});
            });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.envSummary.icon !== this.props.envSummary.icon) {
            if (this.mounted) this.setState({iconTextValue: this.props.envSummary.icon});
        }
    }

    iconTextValueChange(value) {
        this.setState({iconTextValue: value});
    }

    changeIconOrCodeClick(keyCode = null) {
        if (keyCode && keyCode !== 13) return;

        const summary = this.props.envSummary;
        window.dataManager.setEnvProperty({envId: summary.id, name: EnvProperty.icon, value: this.state.iconTextValue})
            .then(() => window.globalState.notify(StateProps.EnvSummariesChanged))
            .catch(window.errorHandler.handle);
    }

    changeColourClick = colour => {
        const summary = this.props.envSummary;
        window.dataManager.setEnvProperty({envId: summary.id, name: EnvProperty.colour, value: colour})
            .then(() => window.globalState.notify(StateProps.EnvSummariesChanged));
    };

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
        return <table className="table is-fullwidth is-bordered">
            <tbody>{comps}</tbody>
        </table>;
    }

    render() {
        const summary = this.props.envSummary;

        const iconPreviewBg = <span className="icon-preview icon-preview-bg" style={{backgroundColor: summary.colour}}>
            <EnvIcon icon={summary.icon}/>
        </span>;
        const iconPreview = <span className="icon-preview" style={{color: summary.colour}}>
            <EnvIcon icon={summary.icon}/>
        </span>;

        const colourPreview = <span className="colour-preview">
            <code>{summary.colour}</code>
            <code style={{backgroundColor: summary.colour}}> </code>
        </span>;

        return <div>

            <p className="env-configure-title title is-5">Environment icon</p>

            <div className="columns">
                <div className="column is-narrow">
                    <div className="field has-addons">
                        <div className="control">
                            <input className="input" type="text" value={this.state.iconTextValue}
                                   placeholder="E.g. 'star' or '_X'"
                                   onChange={event => this.iconTextValueChange(event.target.value)}
                                   onKeyPress={event => this.changeIconOrCodeClick(event.which)}/>
                        </div>
                        <div className="control">
                            <a className="button is-info" onClick={() => this.changeIconOrCodeClick()}>
                                Update icon
                            </a>
                        </div>
                    </div>
                </div>
                <div className="column">
                    Your current environment icon is {iconPreviewBg} or {iconPreview}. This icon is shown in different
                    parts of the interface to make it easier for you to identify the environment. To change the icon,
                    type in the <ExternalLink href="https://fontawesome.com/icons?d=gallery&m=free">a FontAwesome
                    icon</ExternalLink> (e.g <code>star</code>) or short sequence of characters prefixed by an
                    underscore (e.g. <code>_2B</code>) and press the update button.
                </div>
            </div>

            <hr className="env-configure-hr"/>

            <p className="env-configure-title title is-5">Environment colour</p>

            <div className="columns">
                <div className="column is-narrow">
                    <GithubPicker color={summary.colour} colors={Colours} width={263} triangle="hide"
                                  onChangeComplete={color => this.changeColourClick(color.hex)}/>
                </div>
                <div className="column">
                    Your current environment colour is {colourPreview} . This colour is
                    used to highlight different elements of the environment, namely its icon in the environment selector
                    on the left. To change the colour, click on one of the presets on the left.
                </div>
            </div>

            <hr className="env-configure-hr"/>

            <p className="env-configure-title title is-5">Environment visibility</p>

            <div className="columns">
                <div className="column is-narrow">
                    <button className="button is-danger" onClick={() => this.hideButtonClick()}>
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

            <hr className="env-configure-hr"/>

            <p className="env-configure-title title is-5">Info & statistics:</p>

            {this.renderStatistics()}
        </div>;
    }

}

module.exports = withRouter(Configure);
