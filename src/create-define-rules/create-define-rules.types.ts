import type { ReadonlyDeep, Simplify, WritableDeep } from 'type-fest';
import type { PluginGlobals, RulesSchema } from '#modules/meta';
import type { RuleWithSeparators } from './create-define-rules';

/**
 * Empty object shape used as a default when globals or rules are omitted.
 */
type EmptyInput = Record<never, never>;

/**
 * Converts tuple-based rule settings to their readonly input form while keeping
 * secondary options deeply readonly for object literal inference.
 */
type ReadonlyRuleSetting<Rule> =
	Rule extends readonly [infer Primary, infer Secondary] ? readonly [Primary, ReadonlyDeep<Secondary>]
		: Rule extends readonly [infer Primary] ? readonly [Primary]
			: Rule;

/**
 * Type accepted by `defineRules`, keyed by all rule names known to the plugin.
 */
type DefineRulesInput = {
	readonly [RuleName in keyof RulesSchema]?: ReadonlyRuleSetting<RulesSchema[RuleName]>;
};

/**
 * Plugin globals with excess-property validation for object literals.
 */
type ExactPluginGlobals<Globals extends PluginGlobals> =
	Globals & PluginGlobals & Record<Exclude<keyof Globals, keyof PluginGlobals>, never>;

/**
 * Rule map input that preserves the exact keys inferred from the user object
 * while rejecting keys that are not present in `RulesSchema`.
 */
type ExactRulesInput<Rules extends object> =
	DefineRulesInput & Rules & {
		readonly [RuleName in keyof Rules]: RuleName extends keyof RulesSchema ? DefineRulesInput[RuleName] : never;
	};

/**
 * Runtime schema consumed by the internal normalizer.
 */
type PluginConfig<Globals extends PluginGlobals, Rules extends DefineRulesInput> = {
	/**
	 * Global options for the plugin that may affect multiple rules.
	 */
	globals?: Globals;

	/**
	 * A set of rules with their options.
	 */
	rules?: Rules;
};

/**
 * Separators inferred from the globals passed to `createDefineRules`.
 */
type GlobalSeparators<Globals extends PluginGlobals> =
	'separators' extends keyof Globals ? Globals['separators'] : undefined;

/**
 * Secondary options after runtime normalization.
 *
 * Rules that consume BEM separators receive separators from plugin globals;
 * all other rules keep their secondary options as writable output objects.
 */
type NormalizedRuleOptions<
	RuleName,
	Secondary,
	Globals extends PluginGlobals,
> = RuleName extends RuleWithSeparators
	? Simplify<Omit<WritableDeep<Secondary>, 'separators'> & { separators: GlobalSeparators<Globals> }>
	: WritableDeep<Secondary>;

/**
 * Normalized two-item rule tuple returned by `defineRules`.
 */
type NormalizeRuleSettingWithGlobals<
	Rule,
	RuleName,
	Globals extends PluginGlobals,
> =
	Rule extends null ? [null, NormalizedRuleOptions<RuleName, EmptyInput, Globals>]
		: Rule extends readonly [infer Primary] ? [Primary, NormalizedRuleOptions<RuleName, EmptyInput, Globals>]
			: Rule extends readonly [infer Primary, infer Secondary] ? [
				Primary,
				NormalizedRuleOptions<RuleName, Secondary, Globals>,
			]
				: [Rule, NormalizedRuleOptions<RuleName, EmptyInput, Globals>];

/**
 * Exact normalized rule map returned from `defineRules`.
 *
 * The keys match the user-provided rule map, and values reflect the runtime
 * tuple normalization plus global separator injection.
 */
type DefineRulesResult<Rules extends object, Globals extends PluginGlobals> = {
	-readonly [RuleName in keyof Rules]: NormalizeRuleSettingWithGlobals<Rules[RuleName], RuleName, Globals>;
};

/**
 * Function returned from `createDefineRules`.
 */
type DefineRulesFunction<Globals extends PluginGlobals> =
	/**
	 * Defines Stylelint rules with type-safe options and applied globals.
	 *
	 * @param   rules   A partial rules schema where each key is a rule name and value is its config.
	 *
	 * @returns         A normalized rules object ready for Stylelint configuration.
	 */
	<const Rules extends object = EmptyInput>(rules?: ExactRulesInput<Rules>) => DefineRulesResult<Rules, Globals>;

/**
 * Public factory signature for `createDefineRules`.
 */
type CreateDefineRules = {
	/**
	 * Creates a `defineRules` function without custom global plugin options.
	 *
	 * @returns   A function that accepts a `RulesSchema` object and returns a normalized rules config.
	 */
	(globals?: undefined): DefineRulesFunction<EmptyInput>;

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
	<const Globals extends PluginGlobals>(globals: ExactPluginGlobals<Globals>): DefineRulesFunction<Globals>;
};

export type {
	CreateDefineRules,
	DefineRulesFunction,
	DefineRulesInput,
	DefineRulesResult,
	EmptyInput,
	ExactPluginGlobals,
	ExactRulesInput,
	PluginConfig,
};
