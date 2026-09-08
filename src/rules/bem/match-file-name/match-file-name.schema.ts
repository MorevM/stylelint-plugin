import * as v from 'valibot';
import { vFunction, vSeparatorsSchema } from '#modules/rule-utils';

const vEntity = v.picklist(['file', 'directory']);

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Whether the comparison should be case-sensitive.
			 *
			 * If `true`, the file or directory name must match the block name exactly,
			 * including character case. If `false`, case is ignored.
			 *
			 * @default true
			 */
			caseSensitive: v.optional(v.boolean(), true),

			/**
			 * Whether to use the name of the containing directory instead of the file name
			 * for block name comparison.
			 *
			 * This is useful when using a folder-based structure like:
			 * `/components/the-component/index.scss`
			 *
			 * @default false
			 */
			matchDirectory: v.optional(v.boolean(), false),

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
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for when the name does not match the block name.
				 *
				 * @param   entity      Either `'file'` or `'directory'`, depending on which name is being checked.
				 * @param   blockName   The name of the BEM block.
				 *
				 * @returns             The error message to report.
				 */
				match: v.optional(vFunction(
					[vEntity, v.string()] as [entity: typeof vEntity, blockName: v.StringSchema<undefined>],
					v.string(),
				)),

				/**
				 * Custom message for when the name matches the block name structurally
				 * but fails due to case mismatch (if `caseSensitive: true`).
				 *
				 * @param   entity      Either `'file'` or `'directory'`, depending on which name is being checked.
				 * @param   blockName   The name of the BEM block.
				 *
				 * @returns             The error message to report.
				 */
				matchCase: v.optional(vFunction(
					[vEntity, v.string()] as [entity: typeof vEntity, blockName: v.StringSchema<undefined>],
					v.string(),
				)),
			})),
		}),
	),
};
