/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import equal from 'fast-deep-equal';
import {Helmet} from 'react-helmet';
import * as PropTypes from 'prop-types';
import {GithubPicker} from 'react-color';
import {withRouter} from 'react-router-dom';

import Icon from '../components/Icon';
import EnvIcon from '../components/EnvIcon';
import ModalUtil from '../../util/ModalUtil';
import ErrorHandler from '../../util/ErrorHandler';
import ExternalLink from '../components/ExternalLink';
import {EnvProperty, IndexRoutePath, Colors, KeyCode} from '../../util/typedef';

class TabConfigure extends React.Component {

    static propTypes = {
        summary: PropTypes.object.isRequired,
        history: PropTypes.any,
    };

    constructor(props) {
        super(props);

        const summary = this.props.summary;
        this.state = {
            summary,
            icon: summary.icon,
            name: summary.name,
        };
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const summary = this.props.summary;
        const summaryChanged = !equal(prevProps.summary, summary);
        if (summaryChanged) {
            this.setState(prevState => ({
                ...prevState,
                summary,
                icon: summary.icon,
                name: summary.name,
            }));
        }
    }

    inputValueChange(prop, value) {
        this.setState(prevState => {
            const state = prevState;
            state[prop] = value;
            return state;
        });
    }

    changeValueClick(prop, keyCode = null) {
        if (keyCode && keyCode !== KeyCode.Enter) return;

        const id = this.state.summary.id;
        const updateData = {id};
        updateData[prop] = this.state[prop];
        window.ipcModule.setEnvProperty(updateData)
            .catch(ErrorHandler.handleMiscError);
    }

    changeColourClick = color => {
        const id = this.state.summary.id;
        const updateData = {id};
        updateData[EnvProperty.color] = color;
        window.ipcModule.setEnvProperty(updateData)
            .catch(ErrorHandler.handleMiscError);
    };

    hideButtonClick() {
        const summary = this.state.summary;

        ModalUtil.confirm({
            title: `Hide ${summary.name} collection?`,
            text: 'You can restore it later by opening the same folder again.',
            confirmButtonText: 'Yes, hide it',
            cancelButtonText: 'No, cancel',
        })
            .then(result => {
                if (!result) return;
                return window.ipcModule.closeEnvironment({id: this.state.summary.id})
                    .then(() => this.props.history.push(IndexRoutePath));
            })
            .catch(ErrorHandler.handleMiscError);
    }

    renderStatistics() {
        const summary = this.state.summary;
        const stats = [
            {name: 'Collection ID', value: <code>{summary.id}</code>},
            {name: 'Collection path', value: <code>{summary.path}</code>},
        ];

        const comps = new Array(stats.length);
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const key = `stat-${stat.name}`;
            comps[i] = <tr key={key}>
                <td style={{width: 160, textAlign: 'right'}}>{stat.name}</td>
                <td>{stat.value}</td>
            </tr>;
        }
        return <table className="table is-fullwidth">
            <tbody>{comps}</tbody>
        </table>;
    }

    render() {
        const summary = this.state.summary;

        const iconPreviewBg = <EnvIcon icon={summary.icon} color={summary.color}/>;
        const iconPreview = <EnvIcon icon={summary.icon} color={summary.color} background={false}/>;

        const colourPreview = <span className="colour-preview">
            <code>{summary.color}</code><
            code style={{backgroundColor: summary.color}}> </code>
        </span>;

        return <div>
            <Helmet><title>Configure</title></Helmet>

            <p className="title is-5">Collection icon</p>

            <div className="columns">
                <div className="column is-narrow">

                    <div className="field has-addons">
                        <div className="control">
                            <input className="input" type="text" value={this.state.icon} placeholder="star"
                                   onChange={event => this.inputValueChange(EnvProperty.icon, event.target.value)}
                                   onKeyPress={event => this.changeValueClick(EnvProperty.icon, event.which)}/>
                        </div>
                        <div className="control">
                            <button className="button is-info" onClick={() => this.changeValueClick(EnvProperty.icon)}>
                                Update icon
                            </button>
                        </div>
                    </div>

                    <div className="field has-addons">
                        <div className="control">
                            <input className="input" type="text" value={this.state.name} placeholder="star"
                                   onChange={event => this.inputValueChange(EnvProperty.name, event.target.value)}
                                   onKeyPress={event => this.changeValueClick(EnvProperty.name, event.which)}/>
                        </div>
                        <div className="control">
                            <button className="button is-info" onClick={() => this.changeValueClick(EnvProperty.name)}>
                                Update name
                            </button>
                        </div>
                    </div>

                </div>
                <div className="column">
                    Your current collection icon is {iconPreview} or {iconPreviewBg}. To change the icon,
                    type in the name of <ExternalLink href="https://fontawesome.com/icons?d=gallery&m=free">a
                    FontAwesome icon</ExternalLink> (e.g <code>star</code>).
                </div>
            </div>

            <hr/>

            <p className="title is-5">Collection colour</p>

            <div className="columns">
                <div className="column is-narrow">
                    <GithubPicker color={summary.color} colors={Colors} width={263} triangle="hide"
                                  onChangeComplete={color => this.changeColourClick(color.hex)}/>
                </div>
                <div className="column">
                    Your current collection colour is {colourPreview}. This colour is used to highlight different
                    elements of the collection, namely its icon in the environment selector on the left. To change the
                    colour, click on one of the presets on the left.
                </div>
            </div>

            <hr/>

            <p className="title is-5">Collection visibility</p>

            <div className="columns">
                <div className="column is-narrow">
                    <button className="button is-danger" onClick={() => this.hideButtonClick()}>
                        <Icon name="eye-slash"/>
                        <span>Hide this collection</span>
                    </button>
                </div>
                <div className="column">
                    Pressing this button will hide the <strong>{summary.name}</strong> collection from the sidebar. You
                    can always open it again by opening the relevant folder. To delete the collection completely, delete
                    the <code>.ogma-env</code> folder from <code>{summary.path}</code>.
                </div>
            </div>

            <hr/>

            <p className="title is-5">Collection meta data</p>

            {this.renderStatistics()}
        </div>;
    }

}

export default withRouter(TabConfigure);
