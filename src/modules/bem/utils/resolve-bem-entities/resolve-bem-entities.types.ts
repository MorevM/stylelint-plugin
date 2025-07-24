import type { AtRule, Rule } from 'postcss';
import type parser from 'postcss-selector-parser';
import type { Separators } from '#modules/shared';

/**
 * Enhanced `postcss-selector-parser` node, for internal usage only.
 */
export type BemNode<Base = parser.Node> = Base & {
	/**
	 * Adjusted `sourceIndex` of the node, accounting for injected content
	 * during selector resolution (e.g., replacing `&` with parent selector).
	 *
	 * Used to align original and resolved selector nodes when their positions differ.
	 */
	adjustedSourceIndex?: number;

	/**
	 * Offset applied due to contextual constructs like `@at-root` or `@nest`.
	 * Used when computing absolute source positions of nested nodes.
	 */
	offset?: number;

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
		offset: number;
	}>;
};

/**
 * Options used to parse or resolve BEM entities from selectors.
 * Can include either a rule node from PostCSS, or a raw selector string.
 */
export type Options = {
	/**
	 * PostCSS rule or at-rule providing the context for the selector.
	 */
	rule: Rule | AtRule;

	/**
	 * Optional raw selector string (overrides rule.selector if provided).
	 *
	 * @example '&__custom-element'
	 */
	source?: string;

	/**
	 * Set of BEM separators to use for parsing.
	 */
	separators: Separators;
} | {
	/**
	 * Raw selector string.
	 *
	 * @example '.block__item--mod'
	 */
	source: string;

	/**
	 * Set of BEM separators to use for parsing.
	 */
	separators: Separators;
};
