import { isEmpty } from '@morev/utils';
import type parser from 'postcss-selector-parser';

/**
 * Splits a flat selector branch at top-level combinators.
 * Combinators inside functional pseudo-classes remain part of their containing node.
 *
 * @param   nodes   Parsed selector nodes from one branch.
 *
 * @returns         Non-empty compounds in source order.
 */
export const splitSelectorCompounds = <Node extends parser.Node>(nodes: Node[]) => {
	const compounds: Node[][] = [[]];

	for (const node of nodes) {
		if (node.type === 'combinator') {
			compounds.push([]);
			continue;
		}

		compounds.at(-1)!.push(node);
	}

	return compounds.filter((compound) => !isEmpty(compound));
};
