/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const path = require('path');
const React = require('react');
const PropTypes = require('prop-types');
const ReactMarkdown = require('react-markdown');

const Util = require('../../../shared/Util');
const Tabs = require('../helpers/Tabs');

const TabOptions = [
    {path: '', exact: true, name: 'Greeting', icon: 'child'},
    {path: '/about', name: 'About', icon: 'question-circle'},
    {path: '/settings', name: 'Settings', icon: 'cog'},
    {path: '/resolve', name: 'Resolve', icon: 'warning'},
];

class HomePage extends React.Component {

    static propTypes = {
        location: PropTypes.any,
        match: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.state = {

            warnings: [],
        };
    }

    componentDidMount() {
        window.dataManager.ipcModule.getInitWarnings()
            .then(warnings => this.setState({warnings}));
    }

    renderWarnings() {
        const warnings = this.state.warnings;
        if (warnings.length === 0) return null;

        const comps = new Array(warnings.length);
        for (let i = 0; i < warnings.length; i++) {
            comps[i] = <p key={`init-warn-${i}`}><ReactMarkdown source={warnings[i]}/></p>;
        }
        return comps;
    }

    render() {
        return (
            <div>
                <Tabs options={TabOptions} useLinks={true} basePath={this.props.match.url}
                      location={this.props.location} className="is-centered is-toggle is-toggle-rounded"/>
                <section className="hero is-bold">
                    <div className="hero-body has-text-centered">
                        <div className="container">
                            <figure className="image" style={{maxWidth: '275px', margin: '0 auto'}}>
                                <img alt="Eye with a spiral inside it." title="Ogma logo"
                                     src={path.join(Util.getStaticPath(), 'ogma-logo.png')}/>
                            </figure>
                            <h1 className="title" style={{margin: '35px 0'}}>
                                Welcome to Ogma!
                            </h1>
                            <h2 className="subtitle">
                                Choose an existing environment from the list on the
                                <br/>left, or create one by pressing the plus button.
                            </h2>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

}

module.exports = HomePage;
