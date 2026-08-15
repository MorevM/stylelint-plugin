import type parser from 'postcss-selector-parser';
import type { ResolvedSelector } from '#modules/selectors';
import type { AdjustedNode } from '../resolve-selector-nodes.types';

/**
 * Recursively annotates a selector node with positional metadata for nesting resolution.
 *
 * Updates:
 * - `meta.sourceOffset`: offset inside the selector string (e.g. after `@at-root`)
 * - `meta.contextOffset`: offset of rule content in full CSS
 *
 * @param   input           Selector node to adjust.
 * @param   selector        ResolvedSelector context.
 * @param   contextOffset   Offset of rule content in the source selector.
 *
 * @returns                 The same node, annotated with positional metadata (`AdjustedNode`)
 */
const adjustNode = (
	input: parser.Node,
	selector: ResolvedSelector,
	contextOffset: number = 0,
) => {
	const node = input;
	const adjusted = node as AdjustedNode;

	adjusted.meta ??= {
		sourceOffset: 0,
		contextOffset: 0,
	};

	if (selector.offset) {
		adjusted.meta.sourceOffset = selector.offset;
	}

	if (contextOffset) {
		adjusted.meta.contextOffset = contextOffset;
	}

	if ('nodes' in adjusted) {
		/* @ts-expect-error -- TS doesn't see `.nodes` on parser.Container */
		adjusted.nodes = adjusted.nodes
			.map((child) => adjustNode(child, selector, contextOffset));
	}

	return adjusted;
};

/**
 * Recursively annotates all top-level nodes in the source selector with positional metadata.
 * Handles nested structures and selector/context offsets.
 *
 * @param   sourceNodes     Top-level nodes from source selector
 * @param   selector        ResolvedSelector context
 * @param   contextOffset   Offset from beginning of rule content (e.g. after `@at-root`)
 *
 * @returns                 A list of adjusted selector nodes with positional metadata.
 */
export const adjustSource = (
	sourceNodes: parser.Node[],
	selector: ResolvedSelector,
	contextOffset: number = 0,
): AdjustedNode[] => {
	return sourceNodes.map((node) => adjustNode(node, selector, contextOffset));
};
