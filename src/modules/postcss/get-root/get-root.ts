import { isRoot } from '#modules/postcss/is-root/is-root';
import type { Node, Root } from 'postcss';

/**
 * Walks up the parent chain and returns the `Root` node
 * that the given PostCSS `Node` belongs to.
 *
 * @param   node   Any PostCSS node (e.g., Rule, Declaration, AtRule, etc.)
 *
 * @returns        The `Root` node, or `null` if the node is not attached.
 */
export const getRoot = (node: Node | Root): Root | null => {
	if (isRoot(node)) return node;

	let parent: Node | undefined = node.parent;

	while (parent) {
		if (isRoot(parent)) {
			return parent;
		}
		parent = parent.parent;
	}

	return null;
};
