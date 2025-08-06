import type parser from 'postcss-selector-parser';

type Options = {
	/**
	 * Whether to trim leading and trailing whitespace from the result. \
	 * Set to `false` to preserve whitespace exactly as emitted by `toString()` of individual nodes.
	 *
	 * @default true
	 */
	trim: boolean;
};

/**
 * Converts an array of parsed selector nodes into a single string.
 *
 * Useful for reconstructing the textual representation of a selector
 * after AST-based transformations or resolution steps.
 *
 * @param   nodes     Array of `postcss-selector-parser` nodes.
 * @param   options   Optional configuration.
 *
 * @returns           A string representation of the selector.
 */
export const selectorNodesToString = (
	nodes: parser.Node[],
	options: Partial<Options> = {},
) => {
	const { trim = true } = options;
	const result = nodes.map((resolvedNode) => resolvedNode.toString()).join('');

	return trim ? result.trim() : result;
};
