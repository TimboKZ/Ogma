/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const Tabs = require('./Tabs');

const View = {
    List: 'list',
    ListColumns: 'list-columns',
    ThumbsSmall: 'thumbs-small',
    ThumbsLarge: 'thumbs-large',
};
const Views = [View.List, View.ListColumns, View.ThumbsSmall, View.ThumbsLarge];
const ViewOptions = [
    {id: View.List, tooltip: 'List', icon: 'th-list'},
    {id: View.ListColumns, tooltip: 'List columns', icon: 'grip-vertical'},
    {id: View.ThumbsSmall, tooltip: 'Small thumbnails', icon: 'th'},
    {id: View.ThumbsLarge, tooltip: 'Large thumbnails', icon: 'th-large'},
];

class ViewPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(Views),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: View.List,
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <React.Fragment>
            <p className="level-item">View</p>
            <div className="level-item">
                <div className="tabs is-toggle is-small" style={{overflow: 'visible'}}>
                    <Tabs
                        size="small"
                        options={ViewOptions}
                        className="is-toggle"
                        activeOption={this.props.activeOption}
                        onOptionChange={this.props.onOptionChange}/>
                </div>
            </div>
        </React.Fragment>;
    }

}

module.exports = ViewPicker;
module.exports.View = View;
module.exports.Views = Views;
