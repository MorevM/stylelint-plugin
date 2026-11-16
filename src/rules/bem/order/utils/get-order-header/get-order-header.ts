import { normalizeParameters } from '../normalize-parameters/normalize-parameters';
import type { ChildNode } from 'postcss';

/**
 * Builds an authored node header for matching and diagnostics.
 *
 * @param   node   Authored node whose header is needed.
 *
 * @returns        Selector, normalized at-rule header, property name, or serialized fallback.
 */
export const getOrderHeader = (node: ChildNode) => {
	if (node.type === 'rule') return node.selector;
	if (node.type === 'atrule') return `@${node.name} ${normalizeParameters(node.params)}`.trimEnd();
	if (node.type === 'decl') return node.prop;
	return node.toString();
};
