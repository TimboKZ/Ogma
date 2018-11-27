/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const IconTabs = require('./IconTabs');

const ViewSlugs = ['list', 'thumb-small', 'thumb-large'];
const ViewTypes = [
    {slug: ViewSlugs[0], name: 'List', icon: 'th-list'},
    {slug: ViewSlugs[1], name: 'Small thumbnails', icon: 'th'},
    {slug: ViewSlugs[2], name: 'Large thumbnails', icon: 'th-large'},
];

class ViewPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(ViewSlugs),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: ViewSlugs[0],
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <React.Fragment>
            <p className="level-item"><strong>View</strong></p>
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
