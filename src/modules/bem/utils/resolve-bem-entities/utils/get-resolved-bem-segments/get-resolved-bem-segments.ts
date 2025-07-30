import { isEmpty } from '@morev/utils';
import { getRuleContentMeta, isAtRule } from '#modules/postcss';
import { extractSelectorSegment } from '../extract-selector-segment/extract-selector-segment';
import { getBemCandidateSegments } from '../get-bem-candidate-segments/get-bem-candidate-segments';
import type postcss from 'postcss';
import type parser from 'postcss-selector-parser';
import type { BemNode } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities.types';


/**
 * Checks whether two selector node segments are identical by reference,
 * same nodes in same order.
 *
 * @param   a   First selector node segment.
 * @param   b   Second selector node segment.
 *
 * @returns     Whether the segments are reference-equal.
 */
const isSameSegment = (a: parser.Node[], b: parser.Node[]) =>
	a.length === b.length && a.every((node, i) => node === b[i]);

/**
 * Enriches resolved selector nodes with metadata about their relation
 * to the original selector nodes, including matched ranges and full match flags.
 *
 * @param   originalNodes   The original nodes from the user-defined selector.
 * @param   resolvedNodes   The selector nodes after nesting resolution.
 * @param   sourceOffset    Offset of the nodes relative to original rule selector.
 *
 * @returns                 An array of resolved nodes with `.origin` metadata.
 */
const attachOriginMetadata = (
	originalNodes: BemNode[],
	resolvedNodes: parser.Node[],
	sourceOffset: number = 0,
): BemNode[] => {
	const originalNodeRanges = originalNodes.map((node) => {
		const value = node.toString();
		const nodeIndex = node.sourceIndex + sourceOffset;
		const adjustedIndex = node.adjustedSourceIndex ?? node.sourceIndex + sourceOffset;

		return {
			value,
			sourceRange: [nodeIndex, nodeIndex + value.length] as [number, number],
			adjustedRange: [adjustedIndex, adjustedIndex + value.length] as [number, number],
			offset: node.offset ?? 0,
		};
	});

	return resolvedNodes.map((node) => {
		const enrichedNode = node as BemNode;
		const nodeValue = node.toString();
		const resolvedStart = node.sourceIndex;
		const resolvedEnd = resolvedStart + nodeValue.length;

		enrichedNode.sourceMatches = originalNodeRanges
			.map(({ value, adjustedRange: [start, end], sourceRange, offset }) => {
				if (resolvedStart >= end || resolvedEnd <= start) return null;

				const index = nodeValue.indexOf(value);
				const lastIndex = index + value.length;
				const resolvedRange = [index - 1, lastIndex] as [number, number];

				return { value, sourceRange, resolvedRange, offset };
			})
			.filter(Boolean);

		return enrichedNode;
	});
};

/**
 * Applies positional adjustments to a selector node and its children.
 *
 * @param   node            The selector node to adjust.
 * @param   sourceShift     Optional number to shift source index by (for nested resolution).
 * @param   contextOffset   Optional offset (e.g. for `@at-root` context alignment).
 *
 * @returns                 The same node, with adjusted metadata.
 */
const adjustNodeSource = (
	node: parser.Node,
	sourceShift: number = 0,
	contextOffset: number = 0,
): BemNode => {
	const adjustedNode = node as BemNode;

	if ('nodes' in adjustedNode) {
		/* @ts-expect-error -- parser.Container doesn't expose `.nodes` in a way TS can verify */
		adjustedNode.nodes = adjustedNode.nodes
			.map((iNode) => adjustNodeSource(iNode, sourceShift));
	}

	if (sourceShift) {
		adjustedNode.adjustedSourceIndex = node.sourceIndex + sourceShift;
	}

	if (contextOffset) {
		adjustedNode.offset = contextOffset;
	}

	return adjustedNode;
};

/**
 * Traces BEM-related segments from the original (possibly nested) selector
 * to their resolved counterparts, and enriches them with source metadata.
 *
 * This function performs several steps:
 * 1. Extracts BEM candidate segments from the original selector (`&__item`, `&--mod`, etc.).
 * 2. Resolves the full selector tree, adjusting node indices to track positional shifts.
 * 3. Matches original segments to corresponding parts in the resolved selector.
 * 4. Returns only those resolved segments that have a source-level match,
 * enriched with `.origin` metadata pointing back to their source location.
 *
 * Used to connect user-authored BEM entities to their fully-resolved form,
 * while retaining traceability for further validation or linting.
 *
 * @param   sourceSelectorNodes     Nodes from the original (nested) selector.
 * @param   resolvedSelectorNodes   Fully-resolved nodes after nesting flattening.
 * @param   rule                    The rule or at-rule that owns the selector (e.g., for offset calculation).
 * @param   sourceOffset            Offset of the selector nodes relative to original rule selector.
 * @param   sourceInject            Parent injection of the selector nodes came from `resolve-nested-selector`.
 *
 * @returns                         A list of resolved node segments, each linked to a source-level BEM segment.
 */
export const getResolvedBemSegments = (
	sourceSelectorNodes: parser.Node[],
	resolvedSelectorNodes: parser.Node[],
	rule: postcss.Rule | postcss.AtRule,
	sourceOffset: number,
	sourceInject: string,
): BemNode[][] => {
	const relevantSourceSegments = getBemCandidateSegments(sourceSelectorNodes);
	const sourceHasNesting = relevantSourceSegments
		.some((segment) => segment.some((node) => node.type === 'nesting'));

	const isAtRoot = isAtRule(rule, ['at-root', 'nest']);
	const contextOffset = getRuleContentMeta(rule).offset + sourceOffset;

	let sourceShift = 0;

	const adjustedSourceSegments = relevantSourceSegments
		.reduce<BemNode[][]>((acc, segment) => {
			const adjustedSegment = segment.map((node, index) => {
				const isFirstInSegment = index === 0;
				const isNestingNode = node.type === 'nesting';

				// Adjust accumulated shift at the start of each segment (or on `&` node)
				// to account for injected selector parts during nesting resolution.
				// This keeps source index alignment consistent with the resolved tree.
				if ((isFirstInSegment && !isAtRoot && !sourceHasNesting) || isNestingNode) {
					const injectedLength = sourceInject?.length ?? 0;
					const originalLength = isNestingNode ? node.value.length : 0;
					sourceShift += injectedLength - originalLength;
				}

				return adjustNodeSource(node, sourceShift, contextOffset);
			});

			if (!isEmpty(adjustedSegment)) {
				acc.push(adjustedSegment);
			}

			return acc;
		}, []);

	const enrichedSegments = adjustedSourceSegments
		.reduce<BemNode[][]>((acc, adjustedSegment) => {
			const { adjustedSourceIndex, sourceIndex } = adjustedSegment[0];
			const nodeStringIndex = adjustedSourceIndex ?? sourceIndex;

			const resolvedSlice = extractSelectorSegment(resolvedSelectorNodes, nodeStringIndex);

			// For each resolved node, attach metadata indicating whether and how it overlaps
			// with any of the original source nodes (from the user-authored selector).
			// This enables downstream logic to know which BEM entity came from where.
			const enrichedNodes = attachOriginMetadata(adjustedSegment, resolvedSlice);

			acc.push(enrichedNodes);
			return acc;
		}, []);

	// Remove empty and duplicated segments
	return enrichedSegments
		.filter((segment) => !isEmpty(segment))
		// Deduplicate segments: during resolution it's possible for two different
		// original segments to end up producing identical resolved structures.
		// We compare by reference to avoid duplicate BEM entity paths.
		.filter((segment, index, all) =>
			all.findIndex((other) => isSameSegment(segment, other)) === index);
};
