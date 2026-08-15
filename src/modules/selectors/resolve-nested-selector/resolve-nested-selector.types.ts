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
export type ResolvedPathItem = PathItem & {
	/**
	 * Fully resolved selector context after applying this path segment.
	 * Descendants use it as their parent selector and as the value of `&`.
	 */
	resolvedContext: string;

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

	/**
	 * Interpolations replaced while computing `resolvedValue`, with exact ranges
	 * in the original path item value.
	 */
	interpolationReplacements: Array<{
		/**
		 * Resolved interpolation value.
		 */
		resolvedValue: string;

		/**
		 * Range occupied by the interpolation in the original path item value.
		 */
		sourceRange: [number, number];
	}>;
};

/**
 * A replacement performed while resolving a selector.
 */
export type ResolvedSelectorReplacement = {
	/**
	 * Kind of selector transformation represented by this replacement.
	 */
	type: 'parent-injection' | 'nesting' | 'interpolation';

	/**
	 * Exact range occupied by the replaced text in the original selector.
	 */
	sourceRange: [number, number];

	/**
	 * Exact corresponding range in the resolved selector.
	 */
	resolvedRange: [number, number];
};

/**
 * A selector replacement whose final resolved range has not been calculated yet.
 */
export type PendingSelectorReplacement = {
	/**
	 * Kind of selector transformation represented by this replacement.
	 */
	type: ResolvedSelectorReplacement['type'];

	/**
	 * Exact range occupied by the replaced text in the original selector.
	 */
	sourceRange: [number, number];

	/**
	 * Text inserted into the resolved selector.
	 */
	resolvedValue: string;
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
	 * Ordered replacements that map the original selector to the resolved selector.
	 * Parent injection is represented by a zero-width source range at index `0`.
	 */
	replacements: ResolvedSelectorReplacement[];

	/**
	 * The resolved parent selector for this context.
	 * `null` in case of a top-level selector.
	 *
	 * @example '.block'
	 */
	parent: string | null;

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
