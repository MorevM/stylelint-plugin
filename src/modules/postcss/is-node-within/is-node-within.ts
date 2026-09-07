import type { Node } from 'postcss';

type Options = {
	/**
	 * Whether the candidate itself counts as being within the container.
	 *
	 * @default false
	 */
	inclusive?: boolean;
};

/**
 * Checks whether a PostCSS node belongs to another node's subtree.
 *
 * @param   node        Candidate node.
 * @param   container   Node that may contain the candidate.
 * @param   options     Containment options.
 *
 * @returns             Whether the candidate is within the container.
 */
export const isNodeWithin = (
	node: Node,
	container: Node,
	options: Options = {},
) => {
	const { inclusive = false } = options;
	let current: Node | undefined = inclusive ? node : node.parent;

	while (current) {
		if (current === container) return true;
		current = current.parent;
	}

	return false;
};
