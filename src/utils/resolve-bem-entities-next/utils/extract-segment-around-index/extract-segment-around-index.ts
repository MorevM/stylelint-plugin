import type { Node } from 'postcss-selector-parser';

/**
 * Extracts a contiguous segment of selector nodes around a given index.
 *
 * The segment includes the node at the given index and continues backward and forward
 * until a `combinator` node is encountered or the boundaries of the list are reached.
 *
 * @param   resolvedNodes   A flat list of selector nodes (e.g., from a `parseSelectors`).
 * @param   index           The index of the node around which the segment should be extracted.
 *
 * @returns                 A new array containing the contiguous segment of nodes.
 */
export const extractSegmentAroundIndex = (resolvedNodes: Node[], index: number): Node[] => {
	let start = index;
	while (start > 0 && resolvedNodes[start - 1]?.type !== 'combinator') {
		start--;
	}

	let end = index;
	while (end + 1 < resolvedNodes.length && resolvedNodes[end + 1]?.type !== 'combinator') {
		end++;
	}

	return resolvedNodes.slice(start, end + 1);
};
