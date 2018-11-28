/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const {Route, HashRouter} = require('react-router-dom');

const {DataContext, DataManager} = require('./util/DataManager');
const EnvSelector = require('./util/EnvSelector');
const HomePage = require('./pages/HomePage');
const EnvRoot = require('./pages/EnvRoot');

const dataManager = new DataManager();

class AppRoot extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            selectorEnvs: [],
        };
    }

    render() {
        return (
            <DataContext.Provider value={dataManager}>
                <HashRouter>
                    <React.Fragment>
                        <EnvSelector envs={this.state.selectorEnvs}/>
                        <div className="page">
                            <Route path="/" exact component={HomePage}/>
                            <Route path="/envs/:envId" component={EnvRoot}/>
                        </div>
                    </React.Fragment>
                </HashRouter>
            </DataContext.Provider>
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
