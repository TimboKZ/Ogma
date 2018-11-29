/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const IconTabs = require('./IconTabs');

const Views = {
    List: 'list',
    ListColumns: 'list-columns',
    ThumbsSmall: 'thumbs-small',
    ThumbsLarge: 'thumbs-large',
};
const ViewSlugs = [Views.List, Views.ListColumns, Views.ThumbsSmall, Views.ThumbsLarge];
const ViewTypes = [
    {slug: Views.List, name: 'List', icon: 'th-list'},
    {slug: Views.ListColumns, name: 'List columns', icon: 'grip-vertical'},
    {slug: Views.ThumbsSmall, name: 'Small thumbnails', icon: 'th'},
    {slug: Views.ThumbsLarge, name: 'Large thumbnails', icon: 'th-large'},
];

class ViewPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(ViewSlugs),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: Views.List,
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <React.Fragment>
            <p className="level-item">View</p>
            <div className="level-item">
                <div className="tabs is-toggle is-small" style={{overflow: 'visible'}}>
                    <IconTabs
                        activeOption={this.props.activeOption}
                        optionTypes={ViewTypes}
                        onOptionChange={this.props.onOptionChange}/>
                </div>
            </div>
        </React.Fragment>;
    }

}

module.exports = ViewPicker;
module.exports.Views = Views;
module.exports.ViewSlugs = ViewSlugs;
module.exports.ViewTypes = ViewTypes;
