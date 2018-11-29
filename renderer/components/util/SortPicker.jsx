/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const IconTabs = require('./IconTabs');

const SortSlugs = ['relevance', 'name', 'size'];
const SortTypes = [
    {slug: SortSlugs[0], name: 'Relevance', icon: 'sort-amount-down'},
    {slug: SortSlugs[1], name: 'Name', icon: 'sort-alpha-down'},
    {slug: SortSlugs[2], name: 'Size', icon: 'sort-numeric-down'},
];

class SortPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(SortSlugs),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: SortSlugs[0],
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <React.Fragment>
            <p className="level-item">Sort by</p>
            <div className="level-item">
                <div className="tabs is-toggle is-small" style={{overflow: 'visible'}}>
                    <IconTabs
                        activeOption={this.props.activeOption}
                        optionTypes={SortTypes}
                        onOptionChange={this.props.onOptionChange}/>
                </div>
            </div>
        </React.Fragment>;
    }

}

module.exports = SortPicker;
