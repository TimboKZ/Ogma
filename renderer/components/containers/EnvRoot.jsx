/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const {Switch, Route} = require('react-router-dom');

const {StateProps} = require('../../util/GlobalState');
const Tabs = require('../helpers/Tabs');
const SortPicker = require('../helpers/SortPicker');
const ViewPicker = require('../helpers/ViewPicker');
const BrowseTag = require('./BrowseTag');
const Configure = require('./Configure');

const TabOptions = [
    {path: '', exact: true, icon: 'eye', name: 'Explore'},
    {path: '/search', exact: false, icon: 'search', name: 'Search'},
    {path: '/browse-n-tag', exact: false, icon: 'tag', name: 'Browse & tag', comp: BrowseTag},
    {path: '/configure', exact: false, icon: 'cog', name: 'Configure', comp: Configure},
];

class EnvRoot extends React.Component {

    static propTypes = {
        location: PropTypes.any,
        match: PropTypes.any,
    };

    constructor(props) {
        super(props);
        this.state = {
            envSummary: window.dataManager.getEnvSummary({id: props.match.params.envId}),
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.match.params.envId !== this.props.match.params.envId) {
            this.setState({envSummary: window.dataManager.getEnvSummary({id: this.props.match.params.envId})});
        }
    }

    renderRoutes() {
        const comps = [];
        const parentPath = this.props.match.path;
        for (const tab of TabOptions) {
            if (!tab.comp) continue;
            const TabComp = tab.comp;
            comps.push(<Route key={`env-router-${tab.path}`} path={`${parentPath}${tab.path}`} exact={tab.exact}
                              render={props => <TabComp envSummary={this.state.envSummary} {...props}/>}/>);
        }
        return comps;
    }

    render() {
        if (!this.state.envSummary) {
            return <div className="pageloader"><span className="title">Pageloader</span></div>;
        }
        const envSummary = this.state.envSummary;

        return <div>
            <div className="level">
                <div className="level-left" style={{marginLeft: '-1px'}}>
                    <div className="level-item">
                        <h2 className="title is-2 has-text-centered">
                            {envSummary.name} <span style={{fontWeight: 'normal'}}>environment</span>
                        </h2>
                    </div>
                </div>
                <div className="level-right" style={{marginRight: '-1px'}}>
                    <div className="level-item">
                        <p className="subtitle is-4 has-text-grey">{envSummary.root}</p>
                    </div>
                </div>
            </div>
            <div className="level">
                <div className="level-left" style={{marginLeft: '-1px'}}>
                    <div className="level-item">
                        <Tabs options={TabOptions} useLinks={true} basePath={this.props.match.url}
                              location={this.props.location} className="is-boxed"/>
                    </div>
                </div>
                <div className="level-right" style={{marginRight: '-1px'}}>
                    <SortPicker activeOption={window.globalState.get(StateProps.EnvSort)}
                                onOptionChange={sort => window.globalState.set(StateProps.EnvSort, sort)}/>
                    <ViewPicker activeOption={window.globalState.get(StateProps.EnvView)}
                                onOptionChange={view => window.globalState.set(StateProps.EnvView, view)}/>
                </div>
            </div>
            <div className="box env-tab-box">
                <Switch>{this.renderRoutes()}</Switch>
            </div>
        </div>;
    }

}

module.exports = EnvRoot;
