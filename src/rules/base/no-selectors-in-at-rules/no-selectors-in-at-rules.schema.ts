import * as v from 'valibot';
import { vFunction, vStringOrRegExpSchema } from '#modules/rule-utils';

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
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
			ignore: v.optional(
				v.objectWithRest(
					{},
					v.union([
						vStringOrRegExpSchema,
						v.array(vStringOrRegExpSchema),
					]),
				), {},
			),

			/**
			 * Custom message functions for rule violations.
			 * If provided, overrides the default error messages.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for encountering a rule inside an at-rule.
				 *
				 * @param   ruleName     Rule name (e.g. `.block`).
				 * @param   atRuleName   At-rule name (e.g. `media`).
				 *
				 * @returns              The error message to report.
				 */
				unexpected: v.optional(vFunction(
					[v.string(), v.string()] as [ruleName: v.StringSchema<undefined>, atRuleName: v.StringSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
