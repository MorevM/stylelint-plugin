import { resolveSelectorSourceIndex } from '#modules/selectors/resolve-nested-selector/resolve-nested-selector';
import { getNormalizedNodeString } from './get-normalized-node-string';
import type parser from 'postcss-selector-parser';
import type { ResolvedSelector } from '#modules/selectors';
import type { SourceNodeMeta } from '../resolve-selector-nodes.types';

/**
 * Extracts metadata for each atomic node in the source selector tree,
 * including its string value, original position in the raw selector, and
 * resolved position after nesting resolution.
 *
 * @param   nodes      A list of top-level selector nodes.
 * @param   selector   Selector resolution metadata.
 *
 * @returns            An array of metadata objects for each non-container node, containing:
 *                     - `value`: the string representation of the node
 *                     - `sourceRange`: its original position in the raw source selector
 *                     - `resolvedRange`: its position in the resolved selector
 */
export const extractSourceNodeMeta = (
	nodes: parser.Node[],
	selector: ResolvedSelector,
): SourceNodeMeta[] => {
	const result: SourceNodeMeta[] = [];
	const walk = (node: parser.Node, depth: number = 0) => {
		if ('nodes' in node) {
			node.nodes.forEach((inner) => walk(inner, depth + 1));
		}

		// Nodes of type `selector` are skipped, since they act as containers and
		// their inner nodes are already processed individually above.
		// Including them would lead to duplication of source metadata.
		if (node.type === 'selector') return;

		const value = getNormalizedNodeString(node);
		const { sourceIndex } = node;
		const sourceEndIndex = sourceIndex + value.length;

		result.push({
			depth,
			value,
			sourceRange: [sourceIndex, sourceEndIndex],
			resolvedRange: [
				resolveSelectorSourceIndex(selector, sourceIndex),
				resolveSelectorSourceIndex(selector, sourceEndIndex),
			],
		});
	};

	nodes.forEach((node) => walk(node));
	return result;
};
