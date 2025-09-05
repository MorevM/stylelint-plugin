import { getNormalizedNodeString } from './get-normalized-node-string';
import type { AdjustedNode, SourceNodeMeta } from '../resolve-selector-nodes.types';

/**
 * Extracts metadata for each atomic node in the source selector tree,
 * including its string value, original position in the raw selector, and
 * resolved position after nesting resolution.
 *
 * @param   nodes    A list of top-level selector nodes.
 * @param   parent   Parent selector came from `resolve-nested-selector`.
 *
 * @returns          An array of metadata objects for each non-container node, containing:
 *                   - `value`: the string representation of the node
 *                   - `sourceRange`: its original position in the raw source selector
 *                   - `resolvedRange`: its position in the resolved selector
 */
export const extractSourceNodeMeta = (
	nodes: AdjustedNode[],
	parent: string | null = '',
): SourceNodeMeta[] => {
	const result: SourceNodeMeta[] = [];
	const inject = parent ?? '';
	const walk = (node: AdjustedNode) => {
		if ('nodes' in node) {
			node.nodes.forEach((inner) => walk(inner as AdjustedNode));
		}

		// Nodes of type `selector` are skipped, since they act as containers and
		// their inner nodes are already processed individually above.
		// Including them would lead to duplication of source metadata.
		if (node.type === 'selector') return;

		const value = getNormalizedNodeString(node);
		const { sourceIndex, meta: { resolvedSourceIndex } } = node;

		// Adjust offset for `&` (nesting) nodes: their resolved position
		// is shifted by injected selector length.
		const nestingShift = node.type === 'nesting'
			? -inject.length + node.value.length
			: 0;

		result.push({
			value,
			sourceRange: [sourceIndex, sourceIndex + value.length],
			resolvedRange: [
				resolvedSourceIndex + nestingShift,
				resolvedSourceIndex + value.length,
			],
		});
	};

	nodes.forEach((node) => walk(node));
	return result;
};
