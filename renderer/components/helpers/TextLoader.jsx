/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const LoadingState = {
    Loading: 'loading',
    Failed: 'failed',
    Done: 'done',
};
const LoadingStates = [
    LoadingState.Loading,
    LoadingState.Failed,
    LoadingState.Done,
];


class TextLoader extends React.Component {

    // Function used to initialize state of properties in the parent component
    static init = (defaultValue = null) => ({state: LoadingState.Loading, value: defaultValue});
    static fail = (oldVar = {}) => ({...oldVar, state: LoadingState.Failed});
    static finish = (value = null) => ({state: LoadingState.Done, value});

    static propTypes = {
        render: PropTypes.func,
        property: PropTypes.shape({
            state: PropTypes.oneOf(LoadingStates).isRequired,
            value: PropTypes.string,
        }).isRequired,
    };

    static defaultProps = {
        render: null,
    };

    render() {
        const render = this.props.render;
        const state = this.props.property.state;
        const value = this.props.property.value;

        switch (state) {
            case LoadingState.Loading:
                return <em className="text-loader-loading">Loading...</em>;
            case LoadingState.Failed:
                return <span className="text-loader-failed">Loading failed.</span>;
            default:
                if (render) return render(value);
                if (value) return <React.Fragment>{value}</React.Fragment>;
                return <span className="text-loader-none">None.</span>;
        }
    }

}

module.exports = {};
module.exports.TextLoader = TextLoader;
