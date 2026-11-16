import stylelint from 'stylelint';
import * as rules from './rules';

export * from './create-define-rules';
export type {
	OrderSort, OrderSortContainer, OrderSortContext, OrderSorter, OrderSortFamily, OrderSortItem,
	OrderSortPreset, PropertiesGroup, PropertiesSequence, SelectorListOrder, SelectorListSequence,
} from './rules/bem/order/order.types';

export default Object.values(rules)
	.map((rule) => stylelint.createPlugin(rule.ruleName, rule));
