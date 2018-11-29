/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const IconTabs = require('./IconTabs');

const SortOrders = {
    Relevance: 'relevance',
    Name: 'name',
    Size: 'size',
};
const SortSlugs = [
    SortOrders.Relevance,
    SortOrders.Name,
    SortOrders.Size,
];
const SortTypes = [
    {slug: SortOrders.Relevance, name: 'Relevance', icon: 'sort-amount-down'},
    {slug: SortOrders.Name, name: 'Name', icon: 'sort-alpha-down'},
    {slug: SortOrders.Size, name: 'Size', icon: 'sort-numeric-down'},
];

class SortPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(SortSlugs),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: SortOrders.Name,
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
module.exports.SortOrders = SortOrders;
module.exports.SortSlugs = SortSlugs;
