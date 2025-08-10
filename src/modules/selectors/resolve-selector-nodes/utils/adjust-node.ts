import type parser from 'postcss-selector-parser';
import type { ResolvedSelector } from '#modules/selectors';
import type { AdjustedNode } from '../resolve-selector-nodes.types';

type GetNodeShiftOptions = {
	node: parser.Node;
	index: number;
	isTopLevelNode: boolean;
	selector: ResolvedSelector;
};

/**
 * Computes the shift in character offset caused by replacing
 * a nesting selector (`&`) with the injected selector value.
 *
 * This ensures proper alignment of source positions in the resolved selector.
 *
 * @param   options   Options.
 *
 * @returns           The amount of character shift needed to align resolved position.
 */
const getNodeShift = (options: GetNodeShiftOptions) => {
	const { index, isTopLevelNode, node, selector } = options;
	const isFirst = index === 0;
	const isNestingNode = node.type === 'nesting';

	const condition = isTopLevelNode
		? (isFirst || isNestingNode)
		: (isNestingNode && !isFirst);

	if (!condition) return 0;

	const injected = selector.inject.length;
	const original = isNestingNode ? node.value.length : 0;

	return injected - original;
};

/**
 * Recursively annotates a selector node with positional metadata for nesting resolution.
 *
 * Updates:
 * - `meta.sourceOffset`: offset inside the selector string (e.g. after `@at-root`)
 * - `meta.resolvedSourceIndex`: adjusted index in resolved selector
 * - `meta.contextOffset`: offset of rule content in full CSS
 *
 * Applies accumulated shifts to account for replaced `&` tokens and pseudo-constructs.
 *
 * @param   input           Selector node to adjust.
 * @param   selector        ResolvedSelector context.
 * @param   contextOffset   Offset of rule content in the source selector.
 * @param   nestingShift    Accumulated shift caused by replaced `&`, pseudo(), etc.
 *
 * @returns                 The same node, annotated with positional metadata (`AdjustedNode`)
 */
const adjustNode = (
	input: parser.Node,
	selector: ResolvedSelector,
	contextOffset: number = 0,
	nestingShift = 0,
) => {
	const node = input;
	const adjusted = node as AdjustedNode;

	adjusted.meta ??= {
		sourceOffset: 0,
		resolvedSourceIndex: node.sourceIndex,
		contextOffset: 0,
	};

	adjusted.meta.resolvedSourceIndex = node.sourceIndex + nestingShift;

	if (selector.offset) {
		adjusted.meta.sourceOffset = selector.offset;
	}

	if (contextOffset) {
		adjusted.meta.contextOffset = contextOffset;
	}

	if ('nodes' in adjusted) {
		let innerShift = 0;

		/* @ts-expect-error -- TS doesn't see `.nodes` on parser.Container */
		adjusted.nodes = adjusted.nodes.map((child, index) => {
			innerShift += getNodeShift({ index, node: child, isTopLevelNode: false, selector });

			const extraOffset = adjusted.type === 'pseudo'
				? adjusted.value.length + 1 // +1 accounts for `:` character
				: 0;

			return adjustNode(
				child,
				selector,
				contextOffset,
				nestingShift + innerShift + extraOffset,
			);
		});
	}

	return adjusted;
};

/**
 * Recursively annotates all top-level nodes in the source selector with positional metadata.
 * Handles nested structures and offsets caused by replaced `&` or pseudo wrappers.
 *
 * @param   input           Top-level nodes from parsed selector
 * @param   selector        ResolvedSelector context
 * @param   contextOffset   Offset from beginning of rule content (e.g. after @at-root)
 * @param   nestingShift    Optional initial shift from outer nesting (used internally)
 *
 * @returns                 A list of adjusted selector nodes with resolved source positions.
 */
export const adjustSource = (
	input: parser.Node[],
	selector: ResolvedSelector,
	contextOffset: number = 0,
	nestingShift = 0,
): AdjustedNode[] => {
	let accumulatedShift = nestingShift;

	return input.map((node, index) => {
		accumulatedShift += getNodeShift({ node, index, selector, isTopLevelNode: true });
		return adjustNode(node, selector, contextOffset, accumulatedShift);
	});
};
