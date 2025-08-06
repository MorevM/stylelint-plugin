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
