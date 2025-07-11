import { arrayRemoveMutable, isEmpty } from '@morev/utils';
import parser from 'postcss-selector-parser';
import type { Node, Root, Selector } from 'postcss-selector-parser';

const setCustomToString = (nodes: Node[]) => {
	nodes.toString = function () {
		return this.reduce((acc, node) => {
			acc += node.toString();
			return acc;
		}, '');
	};

	return nodes;
};

/**
 * Fixes incorrect parsing of SASS interpolation with `#{&}`.
 *
 * In SASS, a selector like `&--foo#{&}--bar` is valid and should be interpreted as:
 * ['&', '--foo', '#{&}', '--bar']
 *
 * However, `postcss-selector-parser` currently parses this incorrectly as:
 * ['&', '--foo#{', '&', '}--bar']
 *
 * This function mutates the array of nodes to merge broken interpolation fragments into a proper `#{&}` node.
 * It also adjusts `sourceIndex` and source position metadata to keep mapping consistent.
 *
 * TODO: Fill an issue to https://github.com/postcss/postcss-selector-parser/issues
 *
 * @param   nodes   Array of selector nodes parsed by `postcss-selector-parser`.
 *
 * @returns         Same array, with corrected interpolation nodes where needed.
 */
const fixSassNestingNodes = (nodes: Node[]) => {
	const nestingNodes = nodes.filter((node) => node.type === 'nesting');
	if (isEmpty(nestingNodes)) return nodes;

	nestingNodes.forEach((node) => {
		const prevNode = node.prev();
		const nextNode = node.next();

		// Detect broken interpolation pattern: `--foo#{` + `&` + `}--bar`
		if (prevNode?.value?.endsWith('#{') && nextNode?.value?.startsWith('}')) {
			// Convert current nesting node value to full interpolation: '#{&}'
			node.value = '#{&}';

			// Adjust start offset (selector string position) of this node
			node.sourceIndex -= 2;

			// Adjust column positions in source map (if available)
			if (node.source?.start?.column) {
				node.source.start.column -= 2;
			}
			if (node.source?.end?.column) {
				node.source.end.column += 1;
			}

			// Trim trailing `#{` from previous node
			prevNode.value = prevNode.value.slice(0, -2);
			if (prevNode.source?.end?.column) {
				prevNode.source.end.column -= 2;
			}

			// Trim leading `}` from next node
			nextNode.value = nextNode.value.slice(1);
			nextNode.sourceIndex += 1;
			if (nextNode.source?.start?.column) {
				nextNode.source.start.column += 1;
			}
			if (nextNode.source?.end?.column) {
				nextNode.source.end.column += 1;
			}

			// Remove next node if it became empty
			if (!nextNode.value) {
				arrayRemoveMutable(nodes, nextNode);
			}
		}
	});

	return nodes;
};

export const parseSelectors = (selector: string): Node[][] => {
	try {
		let nodes: Node[][] = [];

		parser((root: Root) => {
			nodes = root.nodes.map((selectorNode: Selector) =>
				setCustomToString(fixSassNestingNodes(selectorNode.nodes)));
		}).processSync(selector);

		return nodes;
	} catch {
		// It crashes on invalid syntax while writing,
		// e.g. for `*::` - Error: Pseudo-class or pseudo-element expected
		return [];
	}
};
