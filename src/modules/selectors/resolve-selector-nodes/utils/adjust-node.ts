import type parser from 'postcss-selector-parser';
import type { ResolvedSelector } from '#modules/selectors/types';
import type { AdjustedNode } from '../map-resolved-selectors-to-source.types';

type Options = {
	node: parser.Node;
	index: number;
	isTopLevelNode: boolean;
	selector: ResolvedSelector;
};

const getNodeShift = (options: Options) => {
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

	if (nestingShift) {
		adjusted.meta.resolvedSourceIndex = node.sourceIndex + nestingShift;
	}

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
				? adjusted.value.length + 1
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
