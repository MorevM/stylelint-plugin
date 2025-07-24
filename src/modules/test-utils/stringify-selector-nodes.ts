import { isArray } from '@morev/utils';
import type parser from 'postcss-selector-parser';

type Input = parser.Node[] | parser.Node[][];
type ToReturn<T extends Input> = T extends parser.Node[][] ? string[][] : string[];

/**
 * Converts PostCSS selector AST nodes into string representations.
 *
 * Accepts either a flat list of nodes or a list of node segments (i.e., `Node[]` or `Node[][]`).
 *
 * @param   input   A single segment (`Node[]`) or list of segments (`Node[][]`) from a selector.
 *
 * @returns         A string array (or array of string arrays) representing the nodes.
 */
export const stringifySelectorNodes = <
	T extends Input,
>(input: T): ToReturn<T> => {
	if (isArray(input[0])) {
		return (input as parser.Node[][])
			.map((segment) => segment.map((node) => node.toString())) as ToReturn<T>;
	}

	return (input as parser.Node[]).map((node) => node.toString()) as ToReturn<T>;
};
