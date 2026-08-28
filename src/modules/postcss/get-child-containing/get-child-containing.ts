import type { ChildNode, Container, Node } from 'postcss';

/**
 * Returns the child of a container that contains the given node.
 *
 * Useful when an API operates on a container's direct children,
 * but the available node may be nested deeper in its subtree.
 *
 * @param   container   Container whose direct children define the boundary.
 * @param   node        Node to map to that boundary.
 *
 * @returns             Containing child, or `null` when the node is outside the container.
 */
export const getChildContaining = (
	container: Container,
	node: Node,
): ChildNode | null => {
	let current = node;

	while (current.parent && current.parent !== container) {
		current = current.parent;
	}

	return current.parent === container
		? current as ChildNode
		: null;
};
