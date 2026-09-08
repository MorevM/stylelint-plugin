import * as v from 'valibot';
import { vFunction, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Selectors to ignore (allowed side-effects).
			 * Each entry can be a string (optionally with wildcards) or a regular expression.
			 *
			 * @default []
			 */
			ignore: v.optional(v.array(vStringOrRegExpSchema), []),

			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 * This allows the rule to work correctly with non-standard BEM naming conventions.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Custom message functions for rule violations.
			 * If provided, overrides the default error messages.
			 */
			messages: v.optional(
				v.strictObject({
					/**
					 * Custom message for a rejected selector.
					 *
					 * @param   selector   The offending selector, e.g. `> .side-effect`.
					 *
					 * @returns            The error message to report.
					 */
					rejected: v.optional(vFunction(
						[v.string()] as [selector: v.StringSchema<undefined>],
						v.string(),
					)),
				}),
			),
		}),
	),
};
