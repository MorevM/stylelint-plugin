/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = {
	/**
	 * A map of at-rule names to parameter patterns that should be ignored.
	 *
	 * The key is the name of the at-rule (e.g., `'media'`, `'layer'`, `'include'`).
	 * The value defines which parameter values for that at-rule should be skipped:
	 *
	 * - A string: exact match or wildcard (`'*'`) for any parameter;
	 * - A RegExp: pattern to match the at-rule parameters;
	 * - An array of strings and/or RegExps.
	 *
	 * @default {}
	 */
	ignore?: {
		/**
		 * At-rule name.
		 *
		 * @example 'media'
		 * @example 'layer'
		 * @example 'include'
		 */
		[atRuleName: string]: string | RegExp | Array<string | RegExp>;
	};

	/**
	 * Custom message functions for rule violations.
	 * If provided, overrides the default error messages.
	 */
	messages?: {
		/**
		 * Custom message for encountering a rule inside an at-rule.
		 *
		 * @param   ruleName     Rule name (e.g. `.block`).
		 * @param   atRuleName   At-rule name (e.g. `media`).
		 *
		 * @returns              The error message to report.
		 */
		unexpected?: (ruleName: string, atRuleName: string) => string;
	};
};
