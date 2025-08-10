import type parser from 'postcss-selector-parser';
import type { ResolvedNode } from '#modules/selectors';

/**
 * Checks if a selector node is considered insignificant boundary "noise"
 * in the context of side-effect analysis.
 *
 * This includes:
 * - Whitespace combinators (`' '`), which don't add structural meaning;
 * - Pseudo-classes (e.g., `:hover`, `:not`).
 *
 * These nodes are typically safe to ignore when trimming the edges of
 * a selector fragment to isolate meaningful side-effect targets.
 *
 * @param   node   A `postcss-selector-parser` node to analyze.
 *
 * @returns        `true` if the node is semantically insignificant in boundary analysis.
 */
const isBoundaryNoiseNode = (node: parser.Node) => {
	return (
		(node.type === 'combinator' && !node.value.trim())
		|| node.type === 'pseudo'
	);
};

/**
 * Trims insignificant nodes from the boundaries of a selector fragment
 * that potentially represents a side-effect.
 *
 * The purpose of this function is to isolate the *semantic core* of a
 * side-effect candidate by removing:
 * - Leading pseudo-classes or whitespace combinators (`isBoundaryNoiseNode`)
 * - Trailing pseudo-classes or whitespace combinators
 *
 * Additionally, the function skips all nodes until the first combinator
 * to ensure we're not operating on the same selector context
 * (e.g. when analyzing `.block:hover .foreign-thing`).
 *
 * @param   nodes   A list of resolved selector nodes that follow a known BEM block.
 *
 * @returns         A sliced array of nodes excluding boundary "noise".
 */
export const trimBoundaryNodes = (nodes: ResolvedNode[]) => {
	let start = 0;
	let end = nodes.length;

	let isSameSelector = true;
	while (start < end) {
		if (nodes[start].type === 'combinator') {
			isSameSelector = false;
		}
		if (isSameSelector) { start++; continue; }

		if (isBoundaryNoiseNode(nodes[start])) {
			start++;
		} else {
			break;
		}
	}

	while (end > start && isBoundaryNoiseNode(nodes[end - 1])) {
		end--;
	}

	return nodes.slice(start, end);
};
