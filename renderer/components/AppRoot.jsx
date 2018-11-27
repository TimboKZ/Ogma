/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const {Route, HashRouter} = require('react-router-dom');

const EnvSelector = require('./util/EnvSelector');
const HomePage = require('./pages/HomePage');
const SortPicker = require('./util/SortPicker');
const ViewPicker = require('./util/ViewPicker');


const Envs = [
    {id: 'essays', name: 'Essays', background: '#c24968'},
    {id: 'documents', name: 'Documents', background: '#33c24b'},
];


class AppRoot extends React.Component {

    render() {
        return (
            <HashRouter>
                <React.Fragment>
                    <EnvSelector envs={Envs}/>
                    <div className="page">
                        <Route path="/" exact component={HomePage}/>
                    </div>
                </React.Fragment>
            </HashRouter>
            /*           <div className="container is-fluid">
                           <br/>
                           <div className="columns">
                               <div className="column">

                                   <nav className="level">
                                       <div className="level-left">
                                           <div className="level-item">
                                           </div>
                                       </div>

                                       <div className="level-right">
                                           <SortPicker/>
                                           <div className="level-item"> </div>
                                           <ViewPicker/>
                                       </div>
                                   </nav>


                               </div>
                           </div>
                       </div>*/
        );
    }

}

module.exports = AppRoot;
