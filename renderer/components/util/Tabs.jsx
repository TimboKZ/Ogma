/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const c = require('classnames');
const PropTypes = require('prop-types');
const {Link} = require('react-router-dom');

const Util = require('../../../shared/Util');
const {BulmaSizes} = require('../../../shared/typedef');
const Icon = require('./Icon');

class Tabs extends React.Component {

    static propTypes = {
        size: PropTypes.oneOf(BulmaSizes),
        useLinks: PropTypes.bool,
        basePath: PropTypes.string,
        className: PropTypes.string,
        onOptionChange: PropTypes.func,

        activeOption: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            path: PropTypes.string,
            exact: PropTypes.bool,
            name: PropTypes.string,
            icon: PropTypes.string,
            tooltip: PropTypes.string,
            component: PropTypes.instanceOf(React.Symbol),
        })).isRequired,

        location: PropTypes.any,
    };

    static defaultProps = {
        useLinks: false,
        basePath: '',
    };

    constructor(props) {
        super(props);

        if (this.props.useLinks) {
            if (this.props.onOptionChange)
                console.warn('Both \'useLinks\' and \'onOptionChange\' specified for Tabs component' +
                    ' - note that the callback will not be called (use React router instead>).');
            if (!this.props.location)
                console.warn('Property \'location\' was not passed to Tabs component - React router ' +
                    'links will not work correctly.');
            if (!this.props.basePath)
                console.warn('Property \'basePath\' was not passed to Tabs component - React router ' +
                    'links will not work correctly.');
        }

        this.state = {
            activeOption: props.activeOption,
        };
    }

    optionClick(optionSlug) {
        if (this.props.onOptionChange) this.props.onOptionChange(optionSlug);
        else console.warn('No option change callback specified for Tabs!');

        this.setState({activeOption: optionSlug});
    }

    renderOptions() {
        const options = this.props.options;
        const optionComps = new Array(options.length);
        for (let i = 0; i < options.length; i++) {
            const option = options[i];

            let isActive;
            let LinkComponent;
            const linkProps = {};
            if (this.props.useLinks) {
                if (typeof option.path !== 'string')
                    throw new Error(`Tabs option '${option.name}' either doesn't have 'path' specified, `
                        + `or it's not a string!`);
                const linkPath = `${this.props.basePath}${option.path}`;
                isActive = linkPath === this.props.location.pathname;
                LinkComponent = Link;
                linkProps.to = linkPath;
                if (option.exact) linkProps.exact = 'true';
            } else {
                if (!option.id)
                    throw new Error(`Tabs option '${option.name}' doesn't have 'id' specified!`);
                isActive = option.id === this.state.activeOption;
                LinkComponent = 'a';
                linkProps.onClick = () => this.optionClick(option.id);
            }

            const className = c({
                'tooltip': option.tooltip,
                'is-tooltip-top': option.tooltip,
                'is-active': isActive,
            });

            const slug = Util.slugify(option.icon + option.name);
            const key = `tab-${slug}`;
            const OptionComponent = option.component;
            optionComps[i] = <li key={key} className={className} data-tooltip={option.tooltip}>
                <LinkComponent {...linkProps}>
                    {option.icon && <Icon name={option.icon} size="small"/>}
                    {option.name && <span>{option.name}</span>}
                    {option.component && <OptionComponent/>}
                </LinkComponent>
            </li>;
        }
        return optionComps;
    }

    render() {
        const sizeClass = `is-${this.props.size}`;
        const className = c({
            'tabs': true,
            [sizeClass]: this.props.size,
            [this.props.className]: true,
        });
        return (
            <div className={className} style={{overflow: 'visible'}}>
                <ul>{this.renderOptions()}</ul>
            </div>
        );
    }

}

module.exports = Tabs;
