/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import {Helmet} from 'react-helmet';

import EnvIcon from '../components/EnvIcon';

class AppSettings extends React.Component {

    render() {
        return <div>
            <Helmet><title>Settings</title></Helmet>
            <h1 className="title is-size-4"><EnvIcon icon="cog"/>&nbsp;&nbsp; Settings</h1>
        </div>;
    };

}

export default AppSettings;
