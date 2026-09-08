import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

const vAllowed = v.array(v.string());
const vContext = v.picklist(['root', 'nested']);

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * The name of the variable containing the block reference.
			 *
			 * @default 'b' // based on the first letter of the BEM abbreviation.
			 */
			name: v.optional(v.string(), 'b'),

			/**
			 * Whether the reference must contain an interpolation.
			 *
			 * @default 'always'
			 */
			interpolation: v.optional(v.picklist(['always', 'never', 'ignore']), 'always'),

			/**
			 * Whether a block reference should be the first declaration of an element.
			 *
			 * @default true
			 */
			firstChild: v.optional(v.boolean(), true),

			/**
			 * Whether to automatically replace hardcoded block names with the block variable
			 * in descendant selectors, or with `&` when safely possible in root selectors.
			 *
			 * @default true
			 */
			replaceBlockName: v.optional(v.boolean(), true),

			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 * This allows the rule to work correctly with non-standard BEM naming conventions.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Custom message functions for rule violations.
			 * If provided, they override the default error messages.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Reported when the component is missing the required block reference variable.
				 *
				 * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
				 *
				 * @returns             The error message to report.
				 */
				missingVariable: v.optional(vFunction(
					[v.string()] as [validName: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Reported when the block reference variable exists but is not the
				 * first declaration in the component's root selector.
				 *
				 * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
				 * @param   selector    The component root selector (e.g., ".the-component").
				 *
				 * @returns             The error message to report.
				 */
				variableNotFirst: v.optional(vFunction(
					[v.string(), v.string()] as [validName: v.StringSchema<undefined>, selector: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Reported when the variable exists but its name does not match the expected one.
				 *
				 * @param   expected   The expected variable name (with leading `$`), e.g. `"$b"`.
				 * @param   actual     The actual variable name found (with leading `$`).
				 *
				 * @returns            The error message to report.
				 */
				invalidVariableName: v.optional(vFunction(
					[v.string(), v.string()] as [expected: v.StringSchema<undefined>, actual: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Reported when the variable exists but its value is invalid for the current `interpolation` setting.
				 *
				 * @param   actual    The value found (e.g., ".the-component" or "&").
				 * @param   allowed   List of allowed values (e.g., ['#{&}', '&']).
				 *
				 * @returns           The error message to report.
				 */
				invalidVariableValue: v.optional(vFunction(
					[v.string(), vAllowed] as [actual: v.StringSchema<undefined>, allowed: typeof vAllowed],
					v.string(),
				)),

				/**
				 * Reported when multiple variables that reference the block are defined.
				 *
				 * @param   foundName      A non-expected variable name encountered (with leading `$`).
				 * @param   expectedName   The single expected variable name (with leading `$`).
				 *
				 * @returns                The error message to report.
				 */
				duplicatedVariable: v.optional(vFunction(
					[v.string(), v.string()] as [foundName: v.StringSchema<undefined>, expectedName: v.StringSchema<undefined>],
					v.string(),
				)),

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
				hardcodedBlockName: v.optional(vFunction(
					[v.string(), v.string(), vContext, v.boolean()] as [
						blockSelector: v.StringSchema<undefined>,
						variableRef: v.StringSchema<undefined>,
						context: typeof vContext,
						fixable: v.BooleanSchema<undefined>,
					],
					v.string(),
				)),
			})),
		}),
	),
};
