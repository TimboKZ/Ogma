/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const {DataContext} = require('../util/DataManager');
const Icon = require('../util/Icon');
const SortPicker = require('../util/SortPicker');
const ViewPicker = require('../util/ViewPicker');

class EnvRoot extends React.Component {

    static contextType = DataContext;
    static propTypes = {
        match: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.state = {
            envSummary: null,
        };
    }

    componentDidMount() {
        this.context.getEnvSummary({id: this.props.match.params.envId})
            .then(envSummary => {
                if (envSummary) this.setState({envSummary});
                else alert('Nope!');
            });
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
                        <h2 className="title is-2 has-text-centered">{envSummary.name} environment</h2>
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
                            <ul>
                                <li className="is-active"><a><Icon name="eye"/><span>Explore</span></a></li>
                                <li><a><Icon name="tag"/><span>Browse & tag</span></a></li>
                                <li><a><Icon name="cog"/><span>Tweak settings</span></a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="level-right" style={{marginRight: '-1px'}}>
                    <SortPicker/>
                    <div className="level-item"></div>
                    <ViewPicker/>
                </div>
            </div>
            <div className="box" style={{marginTop: '-24px', borderTopLeftRadius: '0'}}>
                <h1>Test!</h1>
            </div>
        </div>;
    }

}

module.exports = EnvRoot;
