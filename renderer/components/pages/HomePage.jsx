/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const ReactMarkdown = require('react-markdown');
const promiseIpc = require('electron-promise-ipc');

class HomePage extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            warnings: [],
        };
    }

    componentDidMount() {
        promiseIpc.send('getInitWarnings')
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
        return <div className="tile is-child box">
            <div className="content">
                <h1>Welcome to Ogma!</h1>
                <p>Choose an existing environment from the list on the left, or create one by pressing the
                    plus button.</p>
                {this.renderWarnings()}
            </div>
        </div>;
    }

}

module.exports = HomePage;
