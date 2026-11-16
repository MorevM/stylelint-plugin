import { isAtRule } from '#modules/postcss';
import type { ChildNode } from 'postcss';

/**
 * Protects stylesheet preamble directives and layer-order statements from relocation.
 *
 * @param   node   Authored node being classified.
 *
 * @returns        Whether the node must separate independently sortable regions.
 */
export const isPreambleBoundary = (node: ChildNode) => {
	return (isAtRule(node, ['layer'], { ignoreCase: true }) && !node.nodes)
		|| isAtRule(node, ['charset', 'import', 'namespace'], { ignoreCase: true });
};
