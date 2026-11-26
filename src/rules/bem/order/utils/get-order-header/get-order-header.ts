import { isEmpty } from '@morev/utils';
import type { ChildNode } from 'postcss';
import type { OrderItem } from '../../order.internal-types';

/**
 * Returns the authored selector for rule matchers and sorters, including inline Sass qualifiers.
 *
 * @param   item   Ordering unit with its resolved selector metadata.
 *
 * @returns        Selector text for a rule or a classified `@at-root` header.
 */
export const getOrderSelectorText = (item: OrderItem) => {
	const { node, selector } = item;
	if (node.type === 'rule') return node.selector;
	return node.type === 'atrule' && selector ? node.params : undefined;
};

/**
 * Preserves authored header spacing and comments for diagnostics and source ranges.
 *
 * @param   node   Authored node whose header is needed.
 *
 * @returns        Authored header without trailing whitespace, property name, or serialized fallback.
 */
export const getOrderHeader = (node: ChildNode) => {
	if (node.type === 'rule') {
		const selector = node.raws.selector?.value === node.selector ? node.raws.selector.raw : node.selector;

		return `${selector}${node.raws.between ?? ''}`.trimEnd();
	}

	if (node.type === 'atrule') {
		const params = node.raws.params?.value === node.params ? node.raws.params.raw : node.params;
		const afterName = node.raws.afterName ?? (isEmpty(params) ? '' : ' ');

		return `@${node.name}${afterName}${params}${node.raws.between ?? ''}`.trimEnd();
	}

	if (node.type === 'decl') return node.prop;
	return node.toString();
};
