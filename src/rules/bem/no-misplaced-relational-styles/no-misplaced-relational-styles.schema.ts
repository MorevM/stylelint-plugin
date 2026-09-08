import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

const vOwner = v.union([v.string(), v.undefined()]);

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Custom message functions for rule violations.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for relational styles declared outside their target BEM entity.
				 *
				 * @param   target   Target BEM entity.
				 * @param   owner    BEM entity that currently owns the styles, if any.
				 *
				 * @returns          The error message to report.
				 */
				misplaced: v.optional(vFunction(
					[v.string(), vOwner] as [target: v.StringSchema<undefined>, owner: typeof vOwner],
					v.string(),
				)),
			})),
		}),
	),
};
