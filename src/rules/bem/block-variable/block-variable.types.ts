import type { Separators } from '#modules/shared';

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
	 * Whether to automatically replace hardcoded block names with the block variable
	 * in descendant selectors, or with `&` when safely possible in root selectors.
	 *
	 * @default true
	 */
	replaceBlockName?: boolean;

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
	 * This allows the rule to work correctly with non-standard BEM naming conventions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;

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
		 * Reported when a hardcoded block name is used instead of a safe reference.
		 *
		 * @param   blockSelector   The hardcoded block selector found (e.g., ".the-component").
		 * @param   variableRef     The block reference variable that should be used (e.g., "#{$b}").
		 * @param   context         Where the hardcoded selector was found.
		 *                          - `root`: `.foo { .foo__el {} }`
		 *                          - `nested`: `.foo { &__el { .foo__bar {} } }`
		 * @param   fixable         Whether the case can be safely auto-fixed.
		 *
		 * @returns                 The error message to report.
		 */
		hardcodedBlockName?: (
			blockSelector: string,
			variableRef: string,
			context: 'root' | 'nested',
			fixable: boolean,
		) => string;
	};
};
