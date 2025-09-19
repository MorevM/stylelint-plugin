import type { Separators } from '#modules/shared';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = {
	/**
	 * Selectors to ignore (allowed side-effects). \
	 * Each entry can be a string (optionally with wildcards) or a regular expression.
	 *
	 * @default []
	 */
	ignore?: Array<string | RegExp>;

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
	 * This allows the rule to work correctly with non-standard BEM naming conventions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;

	/**
	 * Custom message functions for rule violations.
	 * If provided, overrides the default error messages.
	 */
	messages?: {
		/**
		 * Custom message for a rejected selector.
		 *
		 * @param   selector   The offending selector, e.g. `> .side-effect`.
		 *
		 * @returns            The error message to report.
		 */
		rejected?: (selector: string) => string;
	};
};
