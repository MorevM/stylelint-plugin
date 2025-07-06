import parser from 'postcss-selector-parser';
import type { Node, Root, Selector } from 'postcss-selector-parser';

type Options<T extends boolean> = {
	first: T;
};

type ToReturn<T extends boolean> = T extends true
	? Node[]
	: Node[][];

const setCustomToString = (nodes: Node[]) => {
	nodes.toString = function () {
		return this.reduce((acc, node) => {
			acc += node.toString();
			return acc;
		}, '');
	};

	return nodes;
};

export const parseSelectors = <
	OnlyFirst extends boolean = false,
>(
	selector: string,
	options: Partial<Options<OnlyFirst>> = {},
): ToReturn<OnlyFirst> => {
	const onlyFirst = options.first ?? false;

	try {
		let nodes: Node[][] | Node[] = [];

		parser((root: Root) => {
			nodes = onlyFirst
				? setCustomToString(root.nodes[0]?.nodes ?? [])
				: root.nodes.map((selectorNode: Selector) => setCustomToString(selectorNode.nodes));
		}).processSync(selector);

		return nodes as ToReturn<OnlyFirst>;
	} catch {
		// It crashes on invalid syntax while writing,
		// e.g. for `*::` - Error: Pseudo-class or pseudo-element expected
		return [];
	}
};
