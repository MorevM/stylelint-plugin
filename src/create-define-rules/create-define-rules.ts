import { toArray, tsObject } from '@morev/utils';
import type { PluginGlobals, RulesSchema } from '#modules/meta';
import type {
	CreateDefineRules,
	DefineRulesFunction,
	DefineRulesInput,
	DefineRulesResult,
	EmptyInput,
	ExactRulesInput,
	PluginConfig,
} from './create-define-rules.types';

const rulesWithSeparators = [
	'@morev/bem/block-variable',
	'@morev/bem/match-file-name',
	'@morev/bem/no-block-properties',
	'@morev/bem/no-chained-entities',
	'@morev/bem/no-misplaced-side-effects',
	'@morev/bem/no-side-effects',
	'@morev/bem/selector-pattern',
] as const satisfies ReadonlyArray<keyof RulesSchema>;

type RuleWithSeparators = (typeof rulesWithSeparators)[number];

const defineRules = <
	const Globals extends PluginGlobals = EmptyInput,
	const Rules extends DefineRulesInput = EmptyInput,
>(schema: PluginConfig<Globals, Rules>): DefineRulesResult<Rules, Globals> => {
	return tsObject.fromEntries(
		tsObject.entries(schema.rules ?? {}).map(([key, value_]) => {
			const value = toArray(value_);
			const primary = value[0];
			const secondary = value[1] as Record<string, unknown> | undefined;

			const options = { ...secondary };

			if (rulesWithSeparators.includes(key)) {
				options.separators = schema.globals?.separators;
			}

			return [key, [primary, options]];
		}),
	) as DefineRulesResult<Rules, Globals>;
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
const createDefineRules = (<const Globals extends PluginGlobals = EmptyInput>(globals?: Globals) => {
	/**
	 * Defines Stylelint rules with type-safe options and applied globals.
	 *
	 * @param   rules   A partial rules schema where each key is a rule name and value is its config.
	 *
	 * @returns         A normalized rules object ready for Stylelint configuration.
	 */
	return (<const Rules extends DefineRulesInput = EmptyInput>(
		rules?: ExactRulesInput<Rules>,
	): DefineRulesResult<Rules, Globals> => {
		return defineRules<Globals, Rules>({ globals, rules });
	}) as DefineRulesFunction<Globals>;
}) as CreateDefineRules;

export { createDefineRules };

export type { RuleWithSeparators };
