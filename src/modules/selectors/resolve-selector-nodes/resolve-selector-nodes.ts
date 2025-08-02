import { clamp, omit } from '@morev/utils';
import { getRuleContentMeta } from '#modules/postcss/get-rule-content-meta/get-rule-content-meta';
import { parseSelectors } from '#modules/selectors/parse-selectors/parse-selectors';
import { resolveNestedSelector } from '#modules/selectors/resolve-nested-selector/resolve-nested-selector';
import { adjustSource } from './utils/index';
import type parser from 'postcss-selector-parser';
import type { AdjustedNode, MappedSelector, Options, ResolvedNode, SourceNodeMeta } from './resolve-selector-nodes.types';

const customToString = (node: parser.Node) => {
	return ['class', 'tag'].includes(node.type)
		? node.toString().trim()
		: node.toString();
};

const extractSourceNodeMeta = (
	nodes: AdjustedNode[],
	inject: string,
): SourceNodeMeta[] => {
	const result: SourceNodeMeta[] = [];

	const walk = (node: AdjustedNode) => {
		if ('nodes' in node) {
			node.nodes.forEach((innerNode) => walk(innerNode as AdjustedNode));
		}

		if (node.type === 'selector') return;

		const value = customToString(node);
		const { sourceIndex, meta: { resolvedSourceIndex } } = node;

		const nestingStartOffset = node.type === 'nesting'
			// ? -getLastPartString(parseSelectors(inject)[0]).length + 1
			? -inject.length + 1
			: 0;

		result.push({
			value,
			sourceRange: [sourceIndex, sourceIndex + value.length] as [number, number],
			resolvedRange: [
				resolvedSourceIndex + nestingStartOffset,
				resolvedSourceIndex + value.length,
			] as [number, number],
		});
	};

	nodes.forEach((node) => walk(node));
	return result;
};

const enrichNode = (
	node: parser.Node,
	sourceNodeMeta: SourceNodeMeta[],
	sourceOffset: number,
	contextOffset: number,
	_seenMeta: Set<SourceNodeMeta> = new Set(),
) => {
	const enrichedNode = node as ResolvedNode;
	const nodeStart = node.sourceIndex;
	const nodeEnd = nodeStart + customToString(node).length;

	enrichedNode.meta ??= { sourceMatches: [] };

	if (enrichedNode.type === 'selector') {
		enrichedNode.nodes = enrichedNode.nodes
			.map((iNode: parser.Node) => enrichNode(iNode, sourceNodeMeta, sourceOffset, contextOffset, _seenMeta));

		enrichedNode.meta.sourceMatches = enrichedNode.nodes
			.map((iNode) => iNode.meta.sourceMatches);

		return enrichedNode;
	}

	const matchCandidates = sourceNodeMeta
		.filter((meta) => {
			const { resolvedRange: [metaStart, metaEnd] } = meta;
			return !(nodeStart >= metaEnd || nodeEnd <= metaStart);
		});

	enrichedNode.meta.sourceMatches = matchCandidates
		.map((meta) => {
			const resolvedRange = [nodeStart, nodeEnd] as [number, number];

			const { value, sourceRange } = meta;

			if (node.toString().startsWith(':') && !meta.value.startsWith(':')) {
				return null;
			}

			if (node.toString().startsWith(':') && meta.value.startsWith(':')) {
				if (meta.resolvedRange[0] !== resolvedRange[0]) {
					return;
				}
			}

			if (_seenMeta.has(meta)) return null;

			if (meta.value === '&' && resolvedRange[1] > meta.resolvedRange[1]) {
				resolvedRange[1] = meta.resolvedRange[1];
			}

			if (
				meta.value !== '&'
				&& resolvedRange[1] === meta.resolvedRange[1]
				&& resolvedRange[0] !== meta.resolvedRange[0]
			) {
				resolvedRange[0] = meta.resolvedRange[0];
			}

			node.type !== 'selector' && _seenMeta.add(meta);
			return { value, sourceRange, resolvedRange, sourceOffset, contextOffset };
		})
		.filter(Boolean);


	if ('nodes' in enrichedNode) {
		/* @ts-expect-error -- parser.Container doesn't expose `.nodes` in a way TS can verify */
		enrichedNode.nodes = enrichedNode.nodes
			.map((iNode: parser.Node) => enrichNode(iNode, sourceNodeMeta, sourceOffset, contextOffset, _seenMeta));
	}

	return enrichedNode;
};

export const resolveSelectorNodes = (options: Options) => {
	const contextOffset = getRuleContentMeta(options.node).offset;

	return resolveNestedSelector(options).reduce<MappedSelector[]>((acc, selector) => {
		// `resolveNestedSelector` splits selectors by `,` internally,
		// so it's safe to take the first one directly.
		const sourceNodes = parseSelectors(selector.raw)[0];
		const resolvedNodes = parseSelectors(selector.resolved)[0];

		const sourceOffset = selector.offset;

		const adjustedSourceNodes = adjustSource(sourceNodes, selector, contextOffset);

		const sourceNodeMeta = extractSourceNodeMeta(adjustedSourceNodes, selector.inject);

		const enrichedNodes = resolvedNodes
			.map((node) => enrichNode(node, sourceNodeMeta, sourceOffset, contextOffset));

		acc.push({ resolvedNodes: enrichedNodes, sourceNodes: adjustedSourceNodes });
		return acc;
	}, []);
};
