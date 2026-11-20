import selectorParser from 'postcss-selector-parser';
import type { ChildNode } from 'postcss';
import type { OrderItem } from '../../order.internal-types';

/**
 * Reads the declared name from a CSS or Sass function or mixin signature.
 *
 * @param   node   Authored node being classified.
 *
 * @returns        Sortable definition, if the node declares one.
 */
export const getAtRuleMember = (node: ChildNode): OrderItem['atRuleMember'] => {
	if (node.type !== 'atrule' || !node.nodes) return undefined;
	const directive = node.name.toLowerCase();
	if (directive !== 'function' && directive !== 'mixin') return undefined;

	// A hexadecimal CSS escape can consume whitespace inside the identifier.
	const identifier = /^(?:[\w\P{ASCII}-]|\\(?:[\da-f]{1,6}\s?|[^\d\n\f\ra-f]))+/iu.exec(node.params)?.[0];
	if (!identifier || node.params.startsWith('#{', identifier.length)) return undefined;

	const name = identifier.includes('\\')
		? selectorParser().astSync(`.${identifier}`).first.first.value
		: identifier;
	if (!name) return undefined;

	if (name.startsWith('--')) return { category: directive === 'function' ? 'css:functions' : 'css:mixins', name };
	if (node.name === 'function') return { category: 'sass:functions', name };
	if (node.name === 'mixin') return { category: 'sass:mixins', name };
	return undefined;
};
