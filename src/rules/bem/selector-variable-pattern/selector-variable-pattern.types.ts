import type { Separators } from '#modules/shared';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * A resolved BEM selector exposed to the naming resolver.
 */
export type SelectorVariablePatternSelector = Readonly<{
	/**
	 * Complete resolved selector value of the SASS variable.
	 */
	value: string;

	/**
	 * Complete selector of the resolved BEM entity.
	 */
	bemSelector: string;

	/**
	 * Block name without the class prefix.
	 */
	block: string;

	/**
	 * Element name when the entity contains an element.
	 */
	element: string | null;

	/**
	 * Modifier name when the entity contains a modifier.
	 */
	modifierName: string | null;

	/**
	 * Modifier value when the entity contains a modifier value.
	 */
	modifierValue: string | null;
}>;

/**
 * SASS variable exposed to the naming resolver.
 */
export type SelectorVariablePatternVariable = Readonly<{
	/**
	 * Variable name without the leading `$`.
	 */
	name: string;

	/**
	 * Raw value from the variable declaration.
	 */
	value: string;

	/**
	 * Kind of reference that forms the complete variable value.
	 */
	reference: 'self' | 'variable' | null;
}>;

/**
 * Selector that owns the SASS variable declaration.
 */
export type SelectorVariablePatternOwner = Readonly<{
	/**
	 * Complete resolved selector of the owner rule.
	 */
	selector: string;

	/**
	 * BEM block name when the owner contains exactly one BEM entity.
	 */
	block: string | null;

	/**
	 * Selector nesting level of the variable declaration.
	 * At-rule wrappers do not increase the depth.
	 */
	depth: number;

	/**
	 * Authored selector path from the outermost rule to the owner rule.
	 */
	path: readonly string[];
}>;

/**
 * Context passed to the variable naming resolver.
 */
export type SelectorVariablePatternContext = Readonly<{
	/**
	 * Resolved BEM selector represented by the variable.
	 */
	selector: SelectorVariablePatternSelector;

	/**
	 * SASS variable being checked.
	 */
	variable: SelectorVariablePatternVariable;

	/**
	 * Selector that owns the variable declaration, or `null` for a root declaration.
	 */
	owner: SelectorVariablePatternOwner | null;
}>;

/**
 * Resolves the expected variable name or naming pattern for a BEM selector.
 *
 * A string is an exact expected name without the leading `$`.
 * A regular expression validates the variable name without enabling autofix.
 * A nullish result skips the variable.
 */
export type SelectorVariablePatternResolver = (
	context: SelectorVariablePatternContext,
) => string | RegExp | null | undefined;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = {
	/**
	 * Overrides the default expected variable name or pattern for the BEM selector context.
	 *
	 * By default, plain elements require their exact name, while modified elements require
	 * the variable name to contain the element name. Other selectors are skipped.
	 */
	resolve?: SelectorVariablePatternResolver;

	/**
	 * Custom BEM separators.
	 */
	separators?: Partial<Separators>;

	/**
	 * Custom message functions.
	 */
	messages?: {
		/**
		 * Reported when the variable name does not match the resolved expectation.
		 *
		 * @param   actualName   Actual variable name without the leading `$`.
		 * @param   expected     Exact name or regular expression returned by the resolver.
		 * @param   context      BEM selector variable context.
		 *
		 * @returns              Error message.
		 */
		invalidName?: (
			actualName: string,
			expected: string | RegExp,
			context: SelectorVariablePatternContext,
		) => string;
	};
};
