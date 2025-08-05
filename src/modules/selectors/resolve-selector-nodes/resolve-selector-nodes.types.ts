import type postcss from 'postcss';
import type parser from 'postcss-selector-parser';

/**
 * Options for resolving a nested selector.
 */
export type Options = {
	/**
	 * The PostCSS node at which resolution begins.
	 */
	node: postcss.Rule | postcss.AtRule;

	/**
	 * The selector to resolve. If not provided, will be inferred from the given `node`
	 * (`Rule.selector` or `AtRule.params`).
	 */
	source?: string;
};

/**
 * Enhanced `postcss-selector-parser` node, for internal usage only.
 */
export type AdjustedNode<Base = parser.Node> = Base & {
	meta: {
		/**
		 * Adjusted `sourceIndex` of the node, accounting for injected content
		 * during selector resolution (e.g., replacing `&` with parent selector).
		 *
		 * Used to align original and resolved selector nodes when their positions differ.
		 */
		resolvedSourceIndex: number;

		/**
		 * Offset applied due to contextual constructs like `@at-root` or `@nest`.
		 *
		 * Used when computing absolute source positions.
		 */
		contextOffset: number;

		/**
		 * Offset applied due to position of the selector in case of compound selectors,
		 * e.g. `.foo, .bar` -> `.bar` has offset `6`.
		 *
		 * Used when computing absolute source positions.
		 */
		sourceOffset: number;
	};
};

/**
 * Enhanced `postcss-selector-parser` node.
 */
export type ResolvedNode<Base = parser.Node> = Base & {
	meta: {
		/**
		 * Metadata linking a resolved selector node back to its source
		 * in the original (potentially nested) selector.
		 */
		sourceMatches: Array<{
		/**
		 * The string value of the matched source node.
		 *
		 * @example '__item'
		 */
			value: string;

			/**
			 * Index range in the original source string (raw selector).
			 *
			 * @example [1, 7]
			 */
			sourceRange: [number, number];

			/**
			 * Index range in the resolved source string (with any `&` resolved).
			 *
			 * @example [11, 17]
			 */
			resolvedRange: [number, number];

			/**
			 * Offset applied due to surrounding context (e.g., from `@at-root` or `@nest`).
			 */
			contextOffset: number;

			/**
			 * Offset applied due to position of the selector in case of compound selectors,
			 * e.g. `.foo, .bar` -> `.bar` has offset `6`.
			 *
			 * Used when computing absolute source positions.
			 */
			sourceOffset: number;
		}>;
	};
};

/**
 * A pair of resolved and source selector nodes, enriched with metadata for mapping.
 *
 * - `source` represents the .
 * - `resolved` is the
 *
 * Used as the final output of `resolveSelectorNodes`.
 */
export type MappedSelector = {
	/**
	 * Resolved selector nodes with links to corresponding source nodes.
	 */
	resolved: ResolvedNode[];

	/**
	 * Original source selector nodes with adjustments meta.
	 */
	source: AdjustedNode[];
};

/**
 * Metadata extracted from a single node in the source selector.
 *
 * This structure is used during resolution to map resolved nodes back
 * to their positions in the original source.
 */
export type SourceNodeMeta = {
	/**
	 * The normalized string value of the source node.
	 */
	value: string;

	/**
	 * Index range in the original source selector string (before nesting resolution).
	 */
	sourceRange: [number, number];

	/**
	 * Index range in the resolved selector string (after nesting is resolved).
	 */
	resolvedRange: [number, number];
};
