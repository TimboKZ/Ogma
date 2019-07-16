/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const React = require('react');
const ExactTrie = require('exact-trie');
const PropTypes = require('prop-types');
const equal = require('fast-deep-equal');

const {BulmaSizes} = require('../../util/typedef');

const SizeModifiers = ['xs', 'sm'];
const IconSizeTrie = new ExactTrie({ignoreCase: false});
IconSizeTrie.put('music', 1);
IconSizeTrie.put('terminal', 0);

class Icon extends React.Component {

    static propTypes = {
        name: PropTypes.string.isRequired,
        size: PropTypes.oneOf(BulmaSizes),
        wrapper: PropTypes.bool,
        style: PropTypes.any,
        animation: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        iconModifier: PropTypes.string,
    };

    static defaultProps = {
        wrapper: true, // Enables Bulma wrapper for the icon
        animation: false, // Enables animations, use `true` for standard `spin` animation or custom string
        iconModifier: '', // Arbitrary fontawesome classes, e.g. `fa-fw`
    };

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !equal(this.props, nextProps);
    }

    render() {
        let {name} = this.props;
        const {size, wrapper, style, animation, iconModifier} = this.props;

        let iconClass = 's';
        if (name.charAt(1) === ':') {
            iconClass = name.charAt(0);
            name = name.slice(2);
        }

        let sizeModifier = '';
        let sizeModifierIndex = IconSizeTrie.get(name);
        if (sizeModifierIndex !== undefined) {
            sizeModifier = `fa-${SizeModifiers[sizeModifierIndex]}`;
        }

        let animationModifier = '';
        if (animation) {
            if (animation === true) animationModifier = 'fa-spin';
            else animationModifier = `fa-${animation}`;
        }

        const iconClassName = `fa${iconClass} fa-${name} ${sizeModifier} ${animationModifier} ${iconModifier}`;

        if (wrapper) {
            let className = 'icon';
            if (size) className += ` is-${size}`;
            return <span className={className} style={style}>
                <i className={iconClassName}/>
            </span>;
        }

        return <i className={iconClassName} style={style}/>;
    }

}

export default Icon;
