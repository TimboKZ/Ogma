/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import {Helmet} from 'react-helmet';

import ogmaTear from '../../ogma-tear.png';

class AppNotFound extends React.Component {

    render() {
        return <div>
            <Helmet><title>Page not found</title></Helmet>
            <h1 className="title is-size-4">404 - Page not found</h1>
            <div className="content has-text-centered">
                <p className="subtitle" style={{maxWidth: 600, margin: 'auto'}}>
                    The page you requested could not be found. If you had a collection bookmarked, you might need to
                    open it again.
                </p>
                <br/>
                <img src={ogmaTear} alt="Ogma - page not found"/>
            </div>
        </div>;
    };

}

export default AppNotFound;
