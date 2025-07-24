import type { Separators } from '#modules/shared';

export type ProcessedPattern = {
	/**
	 * The raw configuration value, cast to a string.
	 */
	source: string;

	/**
	 * The value cast to a RegExp, which is
	 * applied for matching inside the rule.
	 */
	regexp: RegExp;
};

/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = Partial<Separators> & Partial<{
	/**
	 * Allowed pattern(s) for BEM block names.
	 *
	 * Supports RegExp, string (including wildcard patterns),
	 * or keywords like `KEBAB_CASE`.
	 *
	 * @default KEBAB_CASE_REGEXP
	 */
	blockPattern: string | RegExp | Array<string | RegExp>;

	/**
	 * Allowed pattern(s) for BEM element names.
	 *
	 * Supports RegExp, string (including wildcard patterns),
	 * or keywords like `KEBAB_CASE`.
	 *
	 * @default KEBAB_CASE_REGEXP
	 */
	elementPattern: string | RegExp | Array<string | RegExp>;

	/**
	 * Allowed pattern(s) for BEM modifier names.
	 *
	 * Supports RegExp, string (including wildcard patterns),
	 * or keywords like `KEBAB_CASE`.
	 *
	 * @default KEBAB_CASE_REGEXP
	 */
	modifierNamePattern: string | RegExp | Array<string | RegExp>;

	/**
	 * Allowed pattern(s) for BEM modifier values.
	 *
	 * Supports RegExp, string (including wildcard patterns),
	 * or keywords like `KEBAB_CASE`.
	 *
	 * @default KEBAB_CASE_REGEXP
	 */
	modifierValuePattern: string | RegExp | Array<string | RegExp>;

	/**
	 * Allowed pattern(s) for utility classes.
	 * Use `false` to forbid utility classes entirely.
	 *
	 * @default ['is-*', 'has-*', 'js-*', '-*']
	 */
	utilityPattern: false | string | RegExp | Array<string | RegExp>;

	/**
	 * Block names to ignore completely. \
	 * Each entry can be a string (optionally with wildcards)
	 * or a regular expression.
	 *
	 * @example
	 * // Ignore blocks by exact name
	 * ['ui-button', 'header']
	 * @example
	 * // Ignore blocks using wildcards or RegExp
	 * ['ui-*', /^legacy-/]
	 *
	 * @default []
	 */
	ignoreBlocks: Array<string | RegExp>;

	/**
	 * Custom message functions for each entity.
	 * If provided, overrides the default error messages.
	 */
	messages: Partial<{
		/**
		 * Custom message for BEM block violations.
		 *
		 * @param   name       Detected block name.
		 * @param   patterns   Allowed patterns in object form.
		 *
		 * @returns            Error message.
		 */
		block: (name: string, patterns: ProcessedPattern[]) => string;

		/**
		 * Custom message for BEM element violations.
		 *
		 * @param   name       Detected element name.
		 * @param   patterns   Allowed patterns in object form.
		 *
		 * @returns            Error message.
		 */
		element: (name: string, patterns: ProcessedPattern[]) => string;

		/**
		 * Custom message for BEM modifier name violations.
		 *
		 * @param   name       Detected modifier name.
		 * @param   patterns   Allowed patterns in object form.
		 *
		 * @returns            Error message.
		 */
		modifierName: (name: string, patterns: ProcessedPattern[]) => string;

		/**
		 * Custom message for BEM modifier value violations.
		 *
		 * @param   name       Detected modifier value.
		 * @param   patterns   Allowed patterns in object form.
		 *
		 * @returns            Error message.
		 */
		modifierValue: (name: string, patterns: ProcessedPattern[]) => string;

		/**
		 * Custom message for utility class violations.
		 *
		 * @param   name       Detected utility class name.
		 * @param   patterns   Allowed patterns in object form
		 *                     or `false` if utilities are forbidden.
		 *
		 * @returns            Error message.
		 */
		utility: (name: string, patterns: ProcessedPattern[] | false) => string;
	}>;
}>;
