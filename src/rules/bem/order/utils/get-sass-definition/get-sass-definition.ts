import selectorParser from 'postcss-selector-parser';
import { isSassDefinition } from '#modules/sass';
import type { ChildNode } from 'postcss';
import type { OrderItem } from '../../order.internal-types';

/**
 * Reads the declared Sass member name from a function or mixin signature.
 *
 * @param   node   Authored node being classified.
 *
 * @returns        Sortable Sass definition, if the node declares one.
 */
export const getSassDefinition = (node: ChildNode): OrderItem['sassDefinition'] => {
	if (!isSassDefinition(node) || !node.nodes) return undefined;

	// A hexadecimal CSS escape can consume whitespace inside the identifier.
	const identifier = /^(?:[\w\P{ASCII}-]|\\(?:[\da-f]{1,6}\s?|[^\d\n\f\ra-f]))+/iu.exec(node.params)?.[0];
	if (!identifier || node.params.startsWith('#{', identifier.length)) return undefined;

	const name = identifier.includes('\\')
		? selectorParser().astSync(`.${identifier}`).first.first.value
		: identifier;
	if (!name || name.startsWith('--')) return undefined;

	return { category: node.name === 'function' ? 'sass:functions' : 'sass:mixins', name };
};
