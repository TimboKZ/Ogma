/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import * as PropTypes from 'prop-types';

export default class Checkbox extends React.Component {

    static propTypes = {
        id: PropTypes.string,
        name: PropTypes.string.isRequired,
        checked: PropTypes.bool,
        onChange: PropTypes.func,
    };

    static defaultProps = {
        checked: false,
    };

    static counter = 0;

    constructor(props) {
        super(props);

        this.state = {checked: this.props.checked};
        this.key = `${this.props.id}-${Checkbox.counter++}`;
    }

    static getDerivedStateFromProps(props, state) {
        const checked = props.checked;
        if (checked === undefined && checked !== state.checked) return {checked};
        return null;
    }

    handleValueChange = event => {
        const checked = event.target.checked;
        if (this.props.onChange) {
            const id = event.target.name;
            this.props.onChange(id, checked);
        }
        this.setState({checked});
    };

    render() {
        return <div className="field">
            <input className="is-checkradio" id={`checkbox-${this.key}`} type="checkbox" name={this.props.id}
                   checked={this.state.checked} onChange={this.handleValueChange}/>
            <label htmlFor={`checkbox-${this.key}`}>{this.props.name}</label>
        </div>;
    };

}