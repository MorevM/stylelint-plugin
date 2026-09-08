import * as v from 'valibot';
import { vFunction, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';

const vContext = v.picklist(['block', 'modifier']);
const vPresetName = v.union([v.string(), v.undefined()]);

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * List of presets to apply globally. \
			 * Available built-in presets: `['EXTERNAL_GEOMETRY', 'CONTEXT_DEPENDENT', 'POSITIONING']`.
			 *
			 * @default ['EXTERNAL_GEOMETRY']
			 */
			presets: v.optional(
				v.array(v.string()),
				['EXTERNAL_GEOMETRY'],
			),

			/**
			 * Custom property presets. \
			 * The key is the preset name, the value is an array of property names. \
			 *
			 * The preset name is passed to the `messages.unexpected` function as an argument (if matched)
			 * and can be used to generate more specific error messages.
			 *
			 * @default {}
			 */
			customPresets: v.optional(
				v.objectWithRest({}, v.array(v.string())),
				{},
			),

			/**
			 * Properties that are globally allowed, regardless of presets or other restrictions.
			 *
			 * @default []
			 */
			allowProperties: v.optional(v.array(v.string()), []),

			/**
			 * Properties that are globally disallowed, regardless of presets.
			 *
			 * @default []
			 */
			disallowProperties: v.optional(v.array(v.string()), []),

			/**
			 * Fine-grained restrictions applied per BEM entity type.
			 *
			 * @default {}
			 */
			perEntity: v.optional(
				v.strictObject({
					/**
					 * Block-level restrictions.
					 *
					 * @default {}
					 */
					block: v.optional(v.object({
						/**
						 * Additional presets to apply only for blocks.
						 *
						 * @default []
						 */
						presets: v.optional(v.array(v.string())),

						/**
						 * Properties explicitly allowed only for blocks.
						 *
						 * @default []
						 */
						allowProperties: v.optional(v.array(v.string())),

						/**
						 * Properties explicitly disallowed only for blocks.
						 *
						 * @default []
						 */
						disallowProperties: v.optional(v.array(v.string())),
					})),

					/**
					 * Modifier-level restrictions.
					 */
					modifier: v.optional(v.object({
						/**
						 * Additional presets to apply only for modifiers.
						 *
						 * @default []
						 */
						presets: v.optional(v.array(v.string())),

						/**
						 * Properties explicitly allowed only for modifiers.
						 *
						 * @default []
						 */
						allowProperties: v.optional(v.array(v.string())),

						/**
						 * Properties explicitly disallowed only for modifiers.
						 *
						 * @default []
						 */
						disallowProperties: v.optional(v.array(v.string())),
					})),
				}),
			),

			/**
			 * List of block names to ignore entirely. \
			 * Supports plain strings, regular expressions,
			 * and wildcard-like patterns (e.g., 'swiper-*').
			 *
			 * @default []
			 */
			ignoreBlocks: v.optional(v.array(vStringOrRegExpSchema), []),

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
			 *
			 * @default {}
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for an unexpected property at block/modifier level.
				 *
				 * @param   propertyName   Restricted CSS property, e.g. `margin-block-start`.
				 * @param   selector       Full selector that triggered the rule, e.g. `.the-component`.
				 * @param   context        BEM entity type of the selector.
				 * @param   presetName     Matched preset name, if available.
				 *
				 * @returns                The error message to report.
				 */
				unexpected: v.optional(vFunction(
					[v.string(), v.string(), vContext, vPresetName] as [
						propertyName: v.StringSchema<undefined>,
						selector: v.StringSchema<undefined>,
						context: typeof vContext,
						presetName: typeof vPresetName,
					],
					v.string(),
				)),
			})),
		}),
	),
};
