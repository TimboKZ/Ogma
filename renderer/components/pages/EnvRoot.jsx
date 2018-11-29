/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');
const {Link} = require('react-router-dom');
const {Route, HashRouter} = require('react-router-dom');

const Icon = require('../util/Icon');
const SortPicker = require('../util/SortPicker');
const ViewPicker = require('../util/ViewPicker');
const BrowseNTag = require('./BrowseNTag');

const Tabs = [
    {path: '', exact: true, icon: 'eye', name: 'Explore'},
    {path: '/search', exact: false, icon: 'search', name: 'Search'},
    {path: '/browse-n-tag', exact: false, icon: 'tag', name: 'Browse & tag', comp: BrowseNTag},
    {path: '/configure', exact: false, icon: 'cog', name: 'Configure'},
];

class EnvRoot extends React.PureComponent {

    static propTypes = {
        location: PropTypes.any,
        match: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.state = {
            envSummary: null,
        };
    }

    componentDidMount() {
        window.dataManager.getEnvSummary({id: this.props.match.params.envId})
            .then(envSummary => {
                if (envSummary) this.setState({envSummary});
                else alert('Nope!');
            });
    }

    renderTabs() {
        const comps = new Array(Tabs.length);
        for (const i in Tabs) {
            const tab = Tabs[i];
            const linkPath = `${this.props.match.url}${tab.path}`;
            const activeClass = linkPath === this.props.location.pathname ? 'is-active' : '';

            comps[i] = <li key={`env-tab-${tab.path}`} className={activeClass}>
                <Link to={linkPath}><Icon name={tab.icon}/><span>{tab.name}</span></Link>
            </li>;
        }
        return comps;
    }

    renderRoutes() {
        const comps = [];
        const parentPath = this.props.match.path;
        for (const tab of Tabs) {
            if (!tab.comp) continue;
            comps.push(<Route key={`env-router-${tab.path}`} path={`${parentPath}${tab.path}`} exact={tab.exact}
                              render={props => <tab.comp envSummary={this.state.envSummary} {...props}/>}/>);
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
                        <div className="tabs is-boxed">
                            <ul>{this.renderTabs()}</ul>
                        </div>
                    </div>
                </div>
                <div className="level-right" style={{marginRight: '-1px'}}>
                    <SortPicker/>
                    <ViewPicker/>
                </div>
            </div>
            <div className="box env-tab-box">
                <HashRouter>
                    <div>{this.renderRoutes()}</div>
                </HashRouter>
            </div>
        </div>;
    }

}

module.exports = EnvRoot;
