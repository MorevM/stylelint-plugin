import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

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
				 * Custom message for a BEM entity extension declared outside its required owner.
				 *
				 * @param   extension   Complete resolved extension selector.
				 * @param   owner       BEM entity that must own the extension.
				 *
				 * @returns             The error message to report.
				 */
				detached: v.optional(vFunction(
					[v.string(), v.string()] as [extension: v.StringSchema<undefined>, owner: v.StringSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
