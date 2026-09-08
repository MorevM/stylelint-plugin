import * as v from 'valibot';
import { vArrayable, vFunction, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { KEBAB_CASE_NUMERIC_REGEXP, KEBAB_CASE_REGEXP } from '#modules/shared';

const processedPatternEntries = {
	/**
	 * The raw configuration value, cast to a string.
	 */
	source: v.string(),

	/**
	 * The regular expression applied for matching inside the rule.
	 */
	regexp: v.instance(RegExp),
};

/**
 * Preserves pattern property documentation in message callback declarations.
 */
type VProcessedPatternSchema = v.ObjectSchema<typeof processedPatternEntries, undefined>;

const vProcessedPattern: VProcessedPatternSchema = v.object(processedPatternEntries);
const vPatterns = v.array(vProcessedPattern);
const vModifierValuePatterns = v.union([v.literal(false), vPatterns]);

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Object containing allowed patterns for different BEM entities.
			 */
			patterns: v.optional(
				v.strictObject({
					/**
					 * Allowed pattern(s) for BEM block names.
					 *
					 * Supports RegExp, string (including wildcard patterns),
					 * or keywords like `'KEBAB_CASE'`.
					 *
					 * @default KEBAB_CASE_REGEXP
					 */
					block: v.optional(
						vArrayable(vStringOrRegExpSchema),
						KEBAB_CASE_REGEXP,
					),

					/**
					 * Allowed pattern(s) for BEM element names.
					 *
					 * Supports RegExp, string (including wildcard patterns),
					 * or keywords like `'KEBAB_CASE_NUMERIC'`.
					 *
					 * @default KEBAB_CASE_NUMERIC_REGEXP
					 */
					element: v.optional(
						vArrayable(vStringOrRegExpSchema),
						KEBAB_CASE_NUMERIC_REGEXP,
					),

					/**
					 * Allowed pattern(s) for BEM modifier names.
					 *
					 * Supports RegExp, string (including wildcard patterns),
					 * or keywords like `'KEBAB_CASE'`.
					 *
					 * @default KEBAB_CASE_REGEXP
					 */
					modifierName: v.optional(
						vArrayable(vStringOrRegExpSchema),
						KEBAB_CASE_REGEXP,
					),

					/**
					 * Allowed pattern(s) for BEM modifier values.
					 *
					 * Supports RegExp, string (including wildcard patterns),
					 * or keywords like `'KEBAB_CASE_NUMERIC'`. \
					 * Use `false` to forbid modifier values entirely.
					 *
					 * @default KEBAB_CASE_NUMERIC_REGEXP
					 */
					modifierValue: v.optional(
						v.union([v.literal(false), vArrayable(vStringOrRegExpSchema)]),
						KEBAB_CASE_NUMERIC_REGEXP,
					),
				}),
				{
					block: KEBAB_CASE_REGEXP,
					element: KEBAB_CASE_NUMERIC_REGEXP,
					modifierName: KEBAB_CASE_REGEXP,
					modifierValue: KEBAB_CASE_NUMERIC_REGEXP,
				},
			),

			/**
			 * Block names to ignore completely. \
			 * Each entry can be a string (optionally with wildcards)
			 * or a regular expression.
			 *
			 * @example
			 * // Ignore blocks by exact name
			 * ['ui-button', 'header']
			 * @example
			 * // Ignore blocks using wildcards or RegExp
			 * ['ui-*', /^legacy-/]
			 *
			 * @default []
			 */
			ignoreBlocks: v.optional(
				v.array(vStringOrRegExpSchema),
				[],
			),

			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 * This allows the rule to work correctly with non-standard BEM naming conventions.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Custom message functions for each entity.
			 * If provided, overrides the default error messages.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for BEM block violations.
				 *
				 * @param   name           Detected block name.
				 * @param   fullSelector   Complete BEM selector.
				 * @param   patterns       Allowed patterns in object form.
				 *
				 * @returns                Error message.
				 */
				block: v.optional(vFunction(
					[v.string(), v.string(), vPatterns] as [
						name: v.StringSchema<undefined>,
						fullSelector: v.StringSchema<undefined>,
						patterns: typeof vPatterns,
					],
					v.string(),
				)),

				/**
				 * Custom message for BEM element violations.
				 *
				 * @param   name           Detected element name.
				 * @param   fullSelector   Complete BEM selector.
				 * @param   patterns       Allowed patterns in object form.
				 *
				 * @returns                Error message.
				 */
				element: v.optional(vFunction(
					[v.string(), v.string(), vPatterns] as [
						name: v.StringSchema<undefined>,
						fullSelector: v.StringSchema<undefined>,
						patterns: typeof vPatterns,
					],
					v.string(),
				)),

				/**
				 * Custom message for BEM modifier name violations.
				 *
				 * @param   name           Detected modifier name.
				 * @param   fullSelector   Complete BEM selector.
				 * @param   patterns       Allowed patterns in object form.
				 *
				 * @returns                Error message.
				 */
				modifierName: v.optional(vFunction(
					[v.string(), v.string(), vPatterns] as [
						name: v.StringSchema<undefined>,
						fullSelector: v.StringSchema<undefined>,
						patterns: typeof vPatterns,
					],
					v.string(),
				)),

				/**
				 * Custom message for BEM modifier value violations.
				 *
				 * @param   name           Detected modifier value.
				 * @param   fullSelector   Complete BEM selector.
				 * @param   patterns       Allowed patterns in object form.
				 *
				 * @returns                Error message.
				 */
				modifierValue: v.optional(vFunction(
					[v.string(), v.string(), vModifierValuePatterns] as [
						name: v.StringSchema<undefined>,
						fullSelector: v.StringSchema<undefined>,
						patterns: typeof vModifierValuePatterns,
					],
					v.string(),
				)),
			})),
		}),
	),
};

export { vProcessedPattern };
export type { VProcessedPatternSchema };
