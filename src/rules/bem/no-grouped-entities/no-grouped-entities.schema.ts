import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Whether to reject every selector list that targets different BEM entities.
			 * When disabled, grouping is allowed until a grouped entity is declared outside the group's lexical subtree.
			 *
			 * @default false
			 */
			strict: v.optional(v.boolean(), false),

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
				 * Custom message for a BEM entity grouped with another declaration owner.
				 *
				 * @param   entity   Grouped BEM entity.
				 * @param   owner    First BEM entity in the selector list.
				 *
				 * @returns          The error message to report.
				 */
				grouped: v.optional(vFunction(
					[v.string(), v.string()] as [entity: v.StringSchema<undefined>, owner: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for a grouped BEM entity that is declared outside its selector group.
				 *
				 * @param   entity   Redeclared grouped BEM entity.
				 * @param   line     Line of the matching external declaration.
				 *
				 * @returns          The error message to report.
				 */
				redeclared: v.optional(vFunction(
					[v.string(), v.number()] as [entity: v.StringSchema<undefined>, line: v.NumberSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
