import { isEmpty } from '@morev/utils';
import type { ResolvedNode } from '../resolve-selector-nodes.types';

/**
 * Resolves the report range of a contiguous resolved selector fragment
 * from its original source matches.
 *
 * @param   nodes   Resolved selector nodes that form the fragment.
 *
 * @returns         Absolute source indices, or `null` when the fragment has no source matches.
 */
export const getResolvedNodesSourceRange = (nodes: ResolvedNode[]) => {
	const sourceMappedNodes = nodes
		.filter((node) => !isEmpty(node.meta.sourceMatches));
	if (isEmpty(sourceMappedNodes)) return null;

	const firstMatch = sourceMappedNodes[0].meta.sourceMatches.at(-1)!;
	const lastMatch = sourceMappedNodes.at(-1)!.meta.sourceMatches[0];

	return {
		index: firstMatch.sourceRange[0] + firstMatch.offset,
		endIndex: lastMatch.sourceRange[1] + lastMatch.offset,
	};
};
