import { getNormalizedNodeString } from './get-normalized-node-string';
import type { ResolvedSelector } from '#modules/selectors';
import type { AdjustedNode, SourceNodeMeta } from '../resolve-selector-nodes.types';

/**
 * Calculates the accumulated length change from resolved SASS variable interpolations
 * located before the given source index.
 *
 * @param   selector      Resolved selector and its substitutions.
 * @param   sourceIndex   Boundary in the original selector.
 *
 * @returns               Offset introduced by preceding interpolations.
 */
const getInterpolationShift = (
	selector: ResolvedSelector,
	sourceIndex: number,
) => {
	if (!selector.substitutions) return 0;

	let shift = 0;

	for (const [interpolation, resolvedValue] of Object.entries(selector.substitutions)) {
		if (!interpolation.startsWith('#{$') || resolvedValue === null) continue;

		let interpolationIndex = selector.source.indexOf(interpolation);
		while (
			interpolationIndex !== -1
			&& interpolationIndex + interpolation.length <= sourceIndex
		) {
			const interpolationEnd = interpolationIndex + interpolation.length;

			shift += resolvedValue.length - interpolation.length;
			interpolationIndex = selector.source.indexOf(interpolation, interpolationEnd);
		}
	}

	return shift;
};

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
	nodes: AdjustedNode[],
	selector: ResolvedSelector,
): SourceNodeMeta[] => {
	const result: SourceNodeMeta[] = [];
	const inject = selector.parent ?? '';
	const walk = (node: AdjustedNode, depth: number = 0) => {
		if ('nodes' in node) {
			node.nodes.forEach((inner) => walk(inner as AdjustedNode, depth + 1));
		}

		// Nodes of type `selector` are skipped, since they act as containers and
		// their inner nodes are already processed individually above.
		// Including them would lead to duplication of source metadata.
		if (node.type === 'selector') return;

		const value = getNormalizedNodeString(node);
		const { sourceIndex, meta: { resolvedSourceIndex } } = node;
		const sourceEndIndex = sourceIndex + value.length;

		// Adjust offset for `&` (nesting) nodes: their resolved position
		// is shifted by injected selector length.
		const nestingShift = node.type === 'nesting'
			? -inject.length + node.value.length
			: 0;

		result.push({
			depth,
			value,
			sourceRange: [sourceIndex, sourceEndIndex],
			resolvedRange: [
				resolvedSourceIndex + nestingShift + getInterpolationShift(selector, sourceIndex),
				resolvedSourceIndex + value.length + getInterpolationShift(selector, sourceEndIndex),
			],
		});
	};

	nodes.forEach((node) => walk(node));
	return result;
};
