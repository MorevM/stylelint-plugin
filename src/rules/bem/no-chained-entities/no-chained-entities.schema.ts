import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Whether to disallow nesting for modifier values:
			 *
			 * @example
			 * ```scss
			 * .block {
			 *   &--theme {
			 *     &--dark {} // ⛔ disallowed if true
			 *   }
			 * }
			 * ```
			 * Instead, enforce writing as:
			 *
			 * ```scss
			 * .block {
			 *   &--theme--dark {} // ✅ flat
			 * }
			 * ```
			 *
			 * @default false
			 */
			disallowNestedModifierValues: v.optional(v.boolean(), false),

			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 * This allows the rule to work correctly with non-standard BEM naming conventions.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Custom message functions for each violation type.
			 * If provided, overrides the default error messages.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for chained BEM block violations.
				 *
				 * @param   actual     Actual BEM selector found in the source code.
				 * @param   expected   Expected BEM selector.
				 *
				 * @returns            Error message.
				 */
				block: v.optional(vFunction(
					[v.string(), v.string()] as [actual: v.StringSchema<undefined>, expected: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for chained BEM element violations.
				 *
				 * @param   actual     Actual BEM selector found in the source code.
				 * @param   expected   Expected BEM selector.
				 *
				 * @returns            Error message.
				 */
				element: v.optional(vFunction(
					[v.string(), v.string()] as [actual: v.StringSchema<undefined>, expected: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for chained BEM modifier violations.
				 *
				 * @param   actual     Actual BEM selector found in the source code.
				 * @param   expected   Expected BEM selector.
				 *
				 * @returns            Error message.
				 */
				modifierName: v.optional(vFunction(
					[v.string(), v.string()] as [actual: v.StringSchema<undefined>, expected: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for chained BEM modifier value violations.
				 *
				 * @param   actual     Actual BEM selector found in the source code.
				 * @param   expected   Expected BEM selector.
				 *
				 * @returns            Error message.
				 */
				modifierValue: v.optional(vFunction(
					[v.string(), v.string()] as [actual: v.StringSchema<undefined>, expected: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for nested BEM modifier values.
				 *
				 * @param   actual     Actual BEM selector found in the source code.
				 * @param   expected   Expected BEM selector.
				 *
				 * @returns            Error message.
				 */
				nestedModifierValue: v.optional(vFunction(
					[v.string(), v.string()] as [actual: v.StringSchema<undefined>, expected: v.StringSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
