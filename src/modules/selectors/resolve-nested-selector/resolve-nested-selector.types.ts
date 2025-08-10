import type { AtRule, Rule } from 'postcss';

/**
 * Part of the nesting path from a selector node to the root.
 */
export type PathItem = {
	/**
	 * Whether this part comes from a rule (`.foo`), `@nest`, or `@at-root`.
	 */
	type: 'rule' | 'nest' | 'at-root';

	/**
	 * The source value of the selector or at-rule parameter.
	 */
	value: string;

	/**
	 * The character index within the original selector string (only for the final node).
	 */
	offset?: number;
};

/**
 * Represents a fully resolved selector from a nested context.
 */
export type ResolvedSelector = {
	/**
	 * The original (unresolved) selector string.
	 *
	 * @example '&--mod'
	 */
	source: string;

	/**
	 * The final resolved selector string.
	 *
	 * @example '.block--mod'
	 */
	resolved: string;

	/**
	 * The value substituted in place of `&` during resolution,
	 * or `null` if `&` was not present in the original selector.
	 *
	 * @example '.block'
	 */
	inject: string;

	/**
	 * The character offset of the `raw` selector relative to the
	 * original input string. \
	 * Useful for mapping resolved selectors back to source positions.
	 */
	offset: number;
};

/**
 * Options for resolving a nested selector.
 */
export type Options = {
	/**
	 * The PostCSS node at which resolution begins.
	 */
	node: Rule | AtRule;

	/**
	 * The selector to resolve. If not provided, will be inferred from the given `node`
	 * (`Rule.selector` or `AtRule.params`).
	 */
	source?: string;
};
