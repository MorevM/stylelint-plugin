import { toArray, tsObject } from '@morev/utils';
import type { PluginGlobals, RulesSchema } from '#modules/meta';

/**
 * Configuration object for the plugin.
 */
type PluginConfig = {
	/**
	 * Global options for the plugin that may affect multiple rules.
	 */
	globals?: PluginGlobals;

	/**
	 * A set of rules with their options.
	 */
	rules?: Partial<RulesSchema>;
};

const rulesWithSeparators = [
	'@morev/bem/block-variable',
	'@morev/bem/no-block-properties',
	'@morev/bem/no-chained-entities',
	'@morev/bem/selector-pattern',
];

const defineRules = (schema: PluginConfig) => {
	return tsObject.fromEntries(
		tsObject.entries(schema.rules ?? {}).map(([key, value_]) => {
			const value = toArray(value_);
			const primary = value[0];
			const secondary = value[1] as any;

			const options = { ...secondary };

			if (rulesWithSeparators.includes(key)) {
				options.separators = schema.globals?.separators;
			}

			return [key, [primary, options]];
		}),
	);
};

/**
 * Creates a `defineRules` function bound to a specific set of global plugin options. \
 * This factory allows to define rules without repeating global settings each time.
 *
 * @example
 * ```ts
 * const defineRules = createDefineRules({
 *   separators: {
 *     element: '__',
 *     modifier: '--',
 *     modifierValue: '--',
 *   },
 * });
 *
 * export default {
 *   rules: defineRules({
 *     '@morev/bem/selector-pattern': true,
 *   }),
 * };
 * ```
 *
 * @param   globals   Global plugin options shared across rules.
 *
 * @returns           A function that accepts a `RulesSchema` object and returns a normalized rules config.
 */
export const createDefineRules = (globals: PluginGlobals) => {
	/**
	 * Defines Stylelint rules with type-safe options and applied globals.
	 *
	 * @param   rules   A partial rules schema where each key is a rule name and value is its config.
	 *
	 * @returns         A normalized rules object ready for Stylelint configuration.
	 */
	return (rules: Partial<RulesSchema>) => defineRules({ globals, rules });
};
