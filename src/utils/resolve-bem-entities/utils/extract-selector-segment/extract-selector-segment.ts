import { isEmpty } from '@morev/utils';
import type { Node } from 'postcss-selector-parser';

/**
 * Extracts a contiguous segment of selector nodes around a given index,
 * considering nodes nested in pseudo-elements like `:where`.
 *
 * The segment includes the node at the given index and continues backward and forward
 * until a `combinator` node is encountered or the boundaries of the list are reached.
 *
 * @param   resolvedNodes     A flat list of selector nodes (e.g., from a `parseSelectors`).
 * @param   nodeStringIndex   Index in the selector string (character offset) used to locate the relevant node.
 *
 * @returns                   The slice of nodes representing the logical segment
 *                            (e.g. compound selector) that includes the matched node.
 */
export const extractSelectorSegment = (
	resolvedNodes: Node[],
	nodeStringIndex: number,
): Node[] => {
	const matchedNode = resolvedNodes.findLast(
		(resolvedNode) => resolvedNode.sourceIndex <= nodeStringIndex
			&& resolvedNode.sourceIndex + resolvedNode.toString().length >= nodeStringIndex,
	);
	if (!matchedNode) return [];

	if (
		(matchedNode.type === 'selector' || matchedNode.type === 'pseudo')
		&& !isEmpty(matchedNode.nodes)
	) {
		return extractSelectorSegment(matchedNode.nodes, nodeStringIndex);
	}

	const matchedIndex = resolvedNodes.indexOf(matchedNode);
	if (matchedIndex === -1) return [];

	let start = matchedIndex;
	while (start > 0 && resolvedNodes[start - 1]?.type !== 'combinator') {
		start--;
	}

	let end = matchedIndex;
	while (end + 1 < resolvedNodes.length && resolvedNodes[end + 1]?.type !== 'combinator') {
		end++;
	}

	return resolvedNodes.slice(start, end + 1);
};
