import { getNormalizedNodeString } from './get-normalized-node-string';
import type parser from 'postcss-selector-parser';
import type { ResolvedNode, SourceNodeMeta } from '../resolve-selector-nodes.types';

/**
 * Recursively links each node in a resolved selector tree to its corresponding
 * source node metadata (value and position), attaching source mapping info into `.meta`.
 *
 * Handles nesting, pseudo-selectors, and potential range mismatches.
 *
 * @param   node             A resolved selector node.
 * @param   sourceNodeMeta   Flattened metadata collected from source selector nodes
 * @param   sourceOffset     Offset of the selector inside the rule (after `@at-root`, etc.)
 * @param   contextOffset    Offset of the rule's content in the source selector (`.bar, .baz`)
 * @param   _seenMeta        Internal set to prevent multiple links to the same source node.
 *
 * @returns                  The same node, enriched with `.meta.sourceMatches`
 */
export const linkSourceMeta = (
	node: parser.Node,
	sourceNodeMeta: SourceNodeMeta[],
	sourceOffset: number,
	contextOffset: number,
	_seenMeta: Set<SourceNodeMeta> = new Set(),
) => {
	const linkedNode = node as ResolvedNode;

	const value = getNormalizedNodeString(node);
	const nodeStart = node.sourceIndex;
	const nodeEnd = nodeStart + value.length;

	linkedNode.meta ??= { sourceMatches: [] };

	// Skip container-level selector nodes; recurse into children instead.
	if (linkedNode.type === 'selector') {
		/* @ts-expect-error -- parser.Container doesn't expose `.nodes` in a way TS can verify */
		linkedNode.nodes = linkedNode.nodes
			.map((iNode: parser.Node) => linkSourceMeta(iNode, sourceNodeMeta, sourceOffset, contextOffset, _seenMeta));

		linkedNode.meta.sourceMatches = linkedNode.nodes
			/* @ts-expect-error -- Trust me `meta` exists */
			.map((iNode) => iNode.meta.sourceMatches);

		return linkedNode;
	}

	// Only consider source nodes that overlap in range
	// and match pseudo-selector constraints.
	const matchCandidates = sourceNodeMeta
		.filter(({ resolvedRange: [metaStart, metaEnd] }) => {
			// Prevent mismatching nested pseudo-selectors. For example:
			// - `&:has(&__baz:is(&--foo))`
			//   `:is` is inside `:has` by range, but must not be matched to it.
			if (value.startsWith(':') && metaStart !== nodeStart) {
				return false;
			}

			return nodeStart < metaEnd && nodeEnd > metaStart;
		});

	linkedNode.meta.sourceMatches = matchCandidates
		.filter((meta) => !_seenMeta.has(meta))
		.map((meta) => {
			// The selector node consists of separate parts and
			// is processed separately above.
			if (node.type !== 'selector') {
				_seenMeta.add(meta);
			}

			const resolvedRange = [nodeStart, nodeEnd] as [number, number];

			// Adjust `resolvedRange` to match the original source range more precisely
			// in cases where multiple source nodes collapse into a single resolved one.
			//
			// Example: `.block { &__element {} }`
			// The resolved selector becomes `.block__element` (a single node),
			// but in source we had two: [`&`, `&__element`].
			// We want to preserve their intent.

			// Case 1: `&` shouldn't extend beyond its original range.
			if (meta.value === '&' && resolvedRange[1] > meta.resolvedRange[1]) {
				resolvedRange[1] = meta.resolvedRange[1];
			}

			// Case 2: for other nodes that end at the same position but start later,
			// shift start backward to match the full source span.
			if (
				meta.value !== '&'
				&& resolvedRange[1] === meta.resolvedRange[1]
				&& resolvedRange[0] !== meta.resolvedRange[0]
			) {
				resolvedRange[0] = meta.resolvedRange[0];
			}

			return {
				value: meta.value,
				sourceRange: meta.sourceRange,
				resolvedRange,
				sourceOffset,
				contextOffset,
			};
		})
		.filter(Boolean);

	// Recurse into child nodes, if present,
	// for example inside pseudo-classes like `:not`.
	if ('nodes' in linkedNode) {
		/* @ts-expect-error -- parser.Container doesn't expose `.nodes` in a way TS can verify */
		linkedNode.nodes = linkedNode.nodes
			.map((iNode: parser.Node) => linkSourceMeta(iNode, sourceNodeMeta, sourceOffset, contextOffset, _seenMeta));
	}

	return linkedNode;
};
