import { arrayRemoveMutable, isEmpty } from '@morev/utils';
import parser from 'postcss-selector-parser';
import { selectorNodesToString } from '#modules/selectors/selector-nodes-to-string/selector-nodes-to-string';

/**
 * Adds a custom `.toString()` implementation to an array of selector nodes.
 *
 * By default, an array of PostCSS selector nodes does not produce a useful string
 * when converted via `.toString()`. This helper attaches a method that joins
 * the string representations of each node for easier use in comparisons and testing.
 *
 * @param   nodes   Array of `Node` objects.
 *
 * @returns         The same array with an overridden `.toString()` method.
 */
const setCustomToString = (nodes: parser.Node[]) => {
	nodes.toString = function () {
		return selectorNodesToString(this, { trim: false });
	};

	return nodes;
};

/**
 * Adjusts the column position of a `parser.Node`.
 *
 * @param   node       The parser node whose source position will be modified.
 * @param   position   Whether to adjust the `start` or `end` column.
 * @param   adjustBy   The number of columns to shift (positive or negative).
 */
const adjustSourceColumn = (
	node: parser.Node,
	position: 'start' | 'end',
	adjustBy: number,
) => {
	if (node.source?.[position]?.column) {
		node.source[position].column += adjustBy;
	}
};

/**
 * Fixes incorrect parsing of SASS interpolation in `postcss-selector-parser`.
 *
 * In SASS, a selector like `&--foo#{&}--bar` is valid and should be interpreted as:
 * ['&', '--foo', '#{&}', '--bar']
 *
 * However, `postcss-selector-parser` currently parses this incorrectly as:
 * ['&', '--foo#{', '&', '}--bar']
 *
 * Also `postcss-selector-parser` calculates wrong `sourceIndex` of interpolated values.
 * https://github.com/postcss/postcss-selector-parser/issues/243
 *
 * The function mutates the array of nodes to merge broken interpolation fragments into a proper node.
 * It also adjusts `sourceIndex` and source position metadata to keep mapping consistent.
 *
 * TODO: Fill an issue to https://github.com/postcss/postcss-selector-parser/issues
 *
 * @param   nodes   Array of selector nodes parsed by `postcss-selector-parser`.
 *
 * @returns         Same array, with corrected interpolation nodes where needed.
 */
const fixSassNestingNodes = (nodes: parser.Node[]) => {
	const nodesToFix = nodes.filter((node) => {
		return (node.type === 'tag' && node.value.match(/#{\$[\w-]+}/))
			|| node.type === 'nesting'
			|| node.type === 'pseudo'
			|| node.type === 'selector';
	});
	if (isEmpty(nodesToFix)) return nodes;

	nodesToFix.forEach((node) => {
		if (node.type === 'pseudo' || node.type === 'selector') {
			fixSassNestingNodes(node.nodes);
			return;
		}

		// Fix broken indices of interpolated values in SASS.
		// https://github.com/postcss/postcss-selector-parser/issues/243
		if (node.type === 'tag') {
			node.sourceIndex -= 3;
			adjustSourceColumn(node, 'start', -3);
			adjustSourceColumn(node, 'end', -3);

			return;
		}

		// Fix incorrect parsing of interpolated parent selector.
		const prevNode = node.prev();
		const nextNode = node.next();

		// Detect broken interpolation pattern: `--foo#{` + `&` + `}--bar`
		if (prevNode?.value?.endsWith('#{') && nextNode?.value?.startsWith('}')) {
			// Convert current nesting node value to full interpolation: '#{&}'
			node.value = '#{&}';

			// Adjust start offset (selector string position) of this node
			node.sourceIndex -= 2;

			// Adjust column positions in source map (if available)
			adjustSourceColumn(node, 'start', -2);
			adjustSourceColumn(node, 'end', 1);

			// Trim trailing `#{` from previous node
			prevNode.value = prevNode.value.slice(0, -2);
			adjustSourceColumn(prevNode, 'end', -2);

			// Trim leading `}` from next node
			nextNode.value = nextNode.value.slice(1);
			nextNode.sourceIndex += 1;
			adjustSourceColumn(nextNode, 'start', 1);
			adjustSourceColumn(nextNode, 'end', 1);

			// Remove nodes that became empty
			if (!prevNode.value) {
				arrayRemoveMutable(nodes, prevNode);
			}
			if (!nextNode.value) {
				arrayRemoveMutable(nodes, nextNode);
			}
		}
	});

	return nodes;
};

/**
 * Parses a CSS selector string into an array of selector node arrays.
 *
 * Each top-level selector (e.g. `.foo, .bar`) becomes a separate array of nodes.
 * Also applies internal patching for SASS interpolation (`#{&}`) and attaches
 * `.toString()` for convenience on each selector part.
 *
 * If the selector is invalid, returns an empty array.
 *
 * @param   selector   Raw selector string to parse.
 *
 * @returns            Array of selector parts, each represented as an array of `Node`s.
 */
export const parseSelectors = (selector: string): parser.Node[][] => {
	try {
		let nodes: parser.Node[][] = [];

		parser((root: parser.Root) => {
			nodes = root.nodes.map((selectorNode: parser.Selector) =>
				setCustomToString(fixSassNestingNodes(selectorNode.nodes)));
		}).processSync(selector);

		return nodes;
	} catch {
		// It crashes on invalid syntax while writing,
		// e.g. for `*::` - Error: Pseudo-class or pseudo-element expected
		return [];
	}
};
