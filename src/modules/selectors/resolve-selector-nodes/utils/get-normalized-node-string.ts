import type parser from 'postcss-selector-parser';

/**
 * Returns a normalized string representation of a selector node,
 * stripping inconsistent leading/trailing whitespace that can affect position tracking.
 *
 * ### Why this is needed
 * The `postcss-selector-parser` library behaves inconsistently for certain node types:
 *
 * - For `combinator` nodes like `>`, `.toString()` returns `' > '` (with spaces),
 * but `node.value` is `'>'`, and `sourceIndex` is set *without* the leading space.
 *
 * - For `tag` or `class` nodes after a combinator, the whitespace *before* the node
 * is excluded from `.toString()` and `sourceIndex`, which is correct.
 *
 * - But for the first selector in a selector node (e.g. `div` in `.foo > section, div`),
 * `.toString()` returns `' div'` and `sourceIndex` starts at 0,
 * as if the leading space is part of the node.
 *
 * These inconsistencies make it impossible to rely on `node.toString()` for precise
 * `sourceIndex` and range calculations without normalization.
 *
 * @param   node   A node from `postcss-selector-parser`.
 *
 * @returns        A trimmed string that more accurately reflects
 *                 the node's position in the selector.
 */
export const getNormalizedNodeString = (node: parser.Node): string => {
	if (['class', 'tag'].includes(node.type)) {
		return node.toString().trim();
	}

	if (node.type === 'combinator' && node.value.trim()) {
		return node.toString().trim();
	}

	return node.toString();
};
