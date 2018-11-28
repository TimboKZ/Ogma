/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const c = require('classnames');
const PropTypes = require('prop-types');

const Icon = require('./Icon');

class IconTabs extends React.Component {

    static propTypes = {
        activeOption: PropTypes.string.isRequired,
        optionTypes: PropTypes.array.isRequired,
        onOptionChange: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            activeOption: props.activeOption,
        };
    }

    optionClick(optionSlug) {
        if (this.props.onOptionChange) this.props.onOptionChange(optionSlug);
        else console.warn('Now option change callback specified for IconTabs!');

        this.setState({activeOption: optionSlug});
    }

    renderOptions() {
        const types = this.props.optionTypes;
        const options = new Array(types.length);
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const className = c({
                'tooltip': true,
                'is-tooltip-top': true,
                'is-active': this.state.activeOption === type.slug,
            });

            options[i] = <li key={type.slug} className={className} data-tooltip={type.name}>
                <a onClick={() => this.optionClick(type.slug)}>
                    <Icon name={type.icon} size="small"/>
                </a>
            </li>;
        }
        return options;
    }

    render() {
        return (
            <div className="tabs is-toggle is-small" style={{overflow: 'visible'}}>
                <ul>{this.renderOptions()}</ul>
            </div>
        );
    }

}

module.exports = IconTabs;
