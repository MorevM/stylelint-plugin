import * as v from 'valibot';
import { vFunction, vStringOrRegExpSchema } from '#modules/rule-utils';

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Whether variables declared at the root level should also be checked.
			 * By default, root-level variables are ignored,
			 * assuming they may be imported elsewhere.
			 *
			 * @default false
			 */
			checkRoot: v.optional(v.boolean(), false),

			/**
			 * A list of variable names to ignore (without leading `$`).
			 * Supports both exact string matches and wildcard patterns.
			 *
			 * @example ['my-var']
			 *
			 * @default []
			 */
			ignore: v.optional(v.array(vStringOrRegExpSchema), []),

			/**
			 * Custom message functions for rule violations.
			 * If provided, overrides the default error messages.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for an unused variable violation.
				 *
				 * @param   name   Variable name (with leading `$`).
				 *
				 * @returns        The error message to report.
				 */
				unused: v.optional(vFunction(
					[v.string()] as [name: v.StringSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
