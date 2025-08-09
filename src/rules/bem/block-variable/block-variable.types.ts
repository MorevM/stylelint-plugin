/**
 * Primary option of the rule.
 *
 * Enables the rule.
 */
export type PrimaryOption = true;


export type SecondaryOption = {
	/**
	 * The name of the variable containing the block reference.
	 *
	 * @default 'b' // based on the first letter of the BEM abbreviation.
	 */
	name?: string;

	/**
	 * Whether the reference must contain an interpolation.
	 *
	 * @default 'always'
	 */
	interpolation?: 'always' | 'never' | 'ignore';

	/**
	 * Whether a block reference should be the first declaration of an element.
	 *
	 * @default true
	 */
	firstChild?: boolean;

	/**
	 * Whether to automatically replace hardcoded occurrences of the block name
	 * inside nested selectors with the corresponding block variable.
	 *
	 * @default true
	 */
	replaceBlockName?: boolean;

	/**
	 * Custom message functions for rule violations.
	 * If provided, they override the default error messages.
	 */
	messages?: {
		/**
		 * Reported when the component is missing the required block reference variable.
		 *
		 * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
		 *
		 * @returns             The error message to report.
		 */
		missingVariable?: (validName: string) => string;

		/**
		 * Reported when the block reference variable exists but is not the
		 * first declaration in the component's root selector.
		 *
		 * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
		 * @param   selector    The component root selector (e.g., ".the-component").
		 *
		 * @returns             The error message to report.
		 */
		variableNotFirst?: (validName: string, selector: string) => string;

		/**
		 * Reported when the variable exists but its name does not match the expected one.
		 *
		 * @param   expected   The expected variable name (with leading `$`), e.g. `"$b"`.
		 * @param   actual     The actual variable name found (with leading `$`).
		 *
		 * @returns            The error message to report.
		 */
		invalidVariableName?: (expected: string, actual: string) => string;

		/**
		 * Reported when the variable exists but its value is invalid for the current `interpolation` setting.
		 *
		 * @param   actual    The value found (e.g., ".the-component" or "&").
		 * @param   allowed   List of allowed values (e.g., ['#{&}', '&']).
		 *
		 * @returns           The error message to report.
		 */
		invalidVariableValue?: (actual: string, allowed: string[]) => string;

		/**
		 * Reported when multiple variables that reference the block are defined.
		 *
		 * @param   foundName      A non-expected variable name encountered (with leading `$`).
		 * @param   expectedName   The single expected variable name (with leading `$`).
		 *
		 * @returns                The error message to report.
		 */
		duplicatedVariable?: (foundName: string, expectedName: string) => string;

		/**
		 * Reported when a hardcoded block name is used inside a nested selector
		 * instead of the block reference variable.
		 *
		 * @param   blockSelector   The hardcoded block selector found (e.g., ".the-component").
		 * @param   variableName    The variable reference that should be used (e.g., "#{$b}").
		 *
		 * @returns                 The error message to report.
		 */
		hardcodedBlockName?: (blockSelector: string, variableName: string) => string;
	};
};
