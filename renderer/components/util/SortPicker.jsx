/**
 * @author v1ndic4te
 * @copyright 2018
 * @licence GPL-3.0
 */

const React = require('react');
const PropTypes = require('prop-types');

const Tabs = require('./Tabs');

const SortOrder = {
    Relevance: 'relevance',
    Name: 'name',
    Size: 'size',
};
const SortOrders = [
    SortOrder.Relevance,
    SortOrder.Name,
    SortOrder.Size,
];
const SortOptions = [
    {id: SortOrder.Relevance, tooltip: 'Relevance', icon: 'sort-amount-down'},
    {id: SortOrder.Name, tooltip: 'Name', icon: 'sort-alpha-down'},
    {id: SortOrder.Size, tooltip: 'Size', icon: 'sort-numeric-down'},
];

class SortPicker extends React.Component {

    static propTypes = {
        activeOption: PropTypes.oneOf(SortOrders),
        onOptionChange: PropTypes.func,
    };

    static defaultProps = {
        activeOption: SortOrder.Name,
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <React.Fragment>
            <p className="level-item">Sort by</p>
            <div className="level-item">
                <div className="tabs is-toggle is-small" style={{overflow: 'visible'}}>
                    <Tabs
                        size="small"
                        options={SortOptions}
                        className="is-toggle"
                        activeOption={this.props.activeOption}
                        onOptionChange={this.props.onOptionChange}/>
                </div>
            </div>
        </React.Fragment>;
    }

}

module.exports = SortPicker;
module.exports.SortOrder = SortOrder;
module.exports.SortOrders = SortOrders;
