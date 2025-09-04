import type { AtRule, ChildNode, Rule } from 'postcss';

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
	 * The character index within the original selector string
	 * (only for the final node).
	 */
	offset?: number;

	/**
	 * The node to which this path belongs,
	 * used for SASS variables resolution.
	 */
	node: ChildNode;
};

/**
 * A path segment with SASS-aware static resolution applied.
 *
 */
export type ResolvedPathItem = Omit<PathItem, 'node'> & {
	/**
	 * The selector after static resolution of SASS variables,
	 * formatted as (S)CSS would expand it at this point in the path.
	 */
	resolvedValue: string;

	/**
	 * Map of placeholders that were actually substituted while computing
	 * `resolvedValue`. Keys are literal placeholders as they appeared in
	 * `value` (e.g. `'#{&}'`, `'#{$var}'`), values are their expansions.
	 * Unresolved placeholders are omitted.
	 */
	usedVariables: Record<string, string>;
};

/**
 * A map of source placeholders to their resolved values.
 *
 * Includes all substitutions performed during resolution:
 * - `&` and replaced with the resolved parent selector (if occurred).
 * - Interpolated forms like `#{&}` or `#{$var}` replaced with their expanded values (if applicable).
 *
 * If no substitutions were required, the value is `null`.
 *
 * @example
 * {
 *   '&': '.block',
 *   '#{$link}': '.block__link'
 * }
 */
export type ResolvedSelectorSubstitutions =
	| null
	| Record<string, string | null>;

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
	 * A map of source placeholders to their resolved values.
	 *
	 * Includes all substitutions performed during resolution:
	 * - `&` and replaced with the resolved parent selector (if occurred).
	 * - Interpolated forms like `#{&}` or `#{$var}` replaced with their expanded values (if applicable).
	 *
	 * If no substitutions were required, the value is `null`.
	 *
	 * @example
	 * {
	 *   '&': '.block',
	 *   '#{$link}': '.block__link'
	 * }
	 */
	substitutions: ResolvedSelectorSubstitutions;

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
