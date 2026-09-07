import type { Node } from 'postcss';

/**
 * Checks whether a PostCSS node has a rule anywhere in its ancestor chain.
 *
 * @param   node   Node to inspect.
 *
 * @returns        Whether an ancestor rule exists.
 */
export const hasAncestorRule = (node: Node) => {
	let ancestor = node.parent;

	while (ancestor) {
		if (ancestor.type === 'rule') return true;
		ancestor = ancestor.parent;
	}

	return false;
};
