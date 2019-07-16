/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import path from 'path';
import upath from 'upath';
import React from 'react';
import {Helmet} from 'react-helmet';
import {connect} from 'react-redux';
import * as PropTypes from 'prop-types';

import Icon from '../components/Icon';
import Breadcrumbs from '../components/Breadcrumbs';
import {EnvDispatcher, TabBrowseDispatcher} from '../../redux/Action';
import FileExplorer from '../components/files/FileExplorer';
import {EnvironmentContext, MenuIds, ExplorerOptionsDefaults} from '../../util/typedef';

class TabBrowse extends React.Component {

    // noinspection JSUnusedGlobalSymbols
    static contextType = EnvironmentContext;

    static propTypes = {
        history: PropTypes.any,
        tabPath: PropTypes.string.isRequired,

        path: PropTypes.string.isRequired,
        rootDirName: PropTypes.string.isRequired,
    };

    constructor(props, context) {
        super(props);
        this.summary = context;

        const uriHash = decodeURI(props.location.hash.slice(1));
        const currPath = uriHash ? uriHash : props.path;

        this.state = {
            path: currPath,
            levelUpDisabled: currPath === '/',
            selection: {},
            contextFileHash: null,
            breadcrumbs: this.pathToBreadcrumbs(props.path),

            optionState: ExplorerOptionsDefaults,
        };
    }

    componentDidMount() {
        this.changePath(this.state.path);
    }

    // noinspection JSCheckFunctionSignatures
    componentDidUpdate(prevProps) {
        const {path: currPath} = this.props;
        if (prevProps.path !== currPath) {
            const normPath = path.normalize(this.props.path);
            this.setState({
                path: currPath,
                levelUpDisabled: currPath === '/',
                breadcrumbs: this.pathToBreadcrumbs(normPath),
            });
        }
    }

    changePath = newPath => {
        const {history, tabPath, path: prevPath} = this.props;

        const normPath = path.normalize(newPath);
        if (normPath !== prevPath) {
            TabBrowseDispatcher.changePath(this.summary.id, normPath);
        }

        const hash = `#${normPath}`;
        history.push(hash);
        EnvDispatcher.updateSubRoute(this.summary.id, `${tabPath}${hash}`);
    };

    pathToBreadcrumbs(normPath) {
        const pathParts = normPath === '/' ? [] : normPath.split('/').slice(1);
        const onClick = this.changePath;
        const breadcrumbs = new Array(pathParts.length + 1);
        breadcrumbs[0] = {id: '/', title: this.props.rootDirName, onClick};

        let currPath = '';
        for (let i = 0; i < pathParts.length; ++i) {
            const part = pathParts[i];
            currPath += `/${part}`;
            breadcrumbs[i + 1] = {id: currPath, title: part, onClick};
        }
        return breadcrumbs;
    }

    render() {
        const state = this.state;

        return <React.Fragment>
            <Helmet><title>Browse</title></Helmet>

            <div className="level env-tag-top-bar">
                <div className="level-left">
                    <div className="level-item">
                        <button className="button" disabled={state.levelUpDisabled}
                                onClick={() => this.changePath(path.join(state.path, '..'))}>
                            <Icon name="level-up-alt"/>
                        </button>
                    </div>
                    <div className="level-item breadcrumbs-level-item">
                        <Breadcrumbs options={state.breadcrumbs}/>
                    </div>
                </div>
                <div className="level-right">
                </div>
            </div>

            <FileExplorer summary={this.summary} path={state.path} changePath={this.changePath}
                          contextMenuId={MenuIds.TabBrowse} allowFolderCreation={true}/>
        </React.Fragment>;
    }

}

export default connect((state, ownProps) => {
    const {summary} = ownProps;
    const {tabBrowse} = state.envMap[summary.id];
    return {
        ...tabBrowse,
        rootDirName: upath.basename(summary.path),
    };
})(TabBrowse);
