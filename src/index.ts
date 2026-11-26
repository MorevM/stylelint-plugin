import stylelint from 'stylelint';
import * as rules from './rules';

export * from './create-define-rules';
export type {
	BlankLineCondition, BlankLineItemScope, BlankLineMode, BlankLinePolicy, BlankLineRule, BlankLines,
	OrderSort, OrderSortContainer, OrderSortContext, OrderSorter, OrderSortFamily, OrderSortItem,
	OrderSortPreset, PropertiesGroup, PropertiesSequence, SelectorListOrder, SelectorListSequence,
	UnspecifiedOrderOptions,
} from './rules/bem/order/order.types';

export default Object.values(rules)
	.map((rule) => stylelint.createPlugin(rule.ruleName, rule));
