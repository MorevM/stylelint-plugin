import { isAtRule } from '#modules/postcss';
import { isSassControlRule, isSassDefinition } from '#modules/sass';
import type { ChildNode } from 'postcss';

/**
 * Protects Sass execution and scope boundaries while allowing whole root definitions to move.
 *
 * @param   node     Authored node being classified.
 * @param   isRoot   Whether document ordering applies in the containing region.
 *
 * @returns          Whether the node separates independently sortable regions.
 */
export const isSassBoundary = (node: ChildNode, isRoot: boolean) => {
	if (isSassDefinition(node)) return !isRoot;

	return isSassControlRule(node)
		|| isAtRule(node, ['at-root', 'forward', 'import', 'return', 'use']);
};
