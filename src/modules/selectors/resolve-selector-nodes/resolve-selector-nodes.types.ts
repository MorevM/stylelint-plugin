import type postcss from 'postcss';
import type parser from 'postcss-selector-parser';
import type { ResolvedSelectorReplacement } from '#modules/selectors/resolve-nested-selector/resolve-nested-selector.types';

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
			 * Offset of the selector branch within the PostCSS node header.
			 * Combines an at-rule prefix and a selector-list branch offset.
			 */
			offset: number;
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
	 * Parsed nearest selector context that lexically contains the current branch. \
	 * Preserved when `@at-root` removes that context from the emitted selector.
	 */
	lexicalParent: parser.Node[] | null;

	/**
	 * Parsed resolved parent context used to produce the current branch. \
	 * `null` when no parent context was substituted or injected.
	 */
	parent: parser.Node[] | null;

	/**
	 * Resolved selector nodes with links to corresponding source nodes.
	 */
	resolved: ResolvedNode[];

	/**
	 * Ordered replacements applied while resolving the selector.
	 */
	replacements: ResolvedSelectorReplacement[];

	/**
	 * Original source selector nodes.
	 */
	source: parser.Node[];
};

/**
 * Metadata extracted from a single node in the source selector.
 *
 * This structure is used during resolution to map resolved nodes back
 * to their positions in the original source.
 */
export type SourceNodeMeta = {
	/**
	 * Nesting depth in the selector AST,
	 * used to separate functional pseudo descendants.
	 */
	depth: number;

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
