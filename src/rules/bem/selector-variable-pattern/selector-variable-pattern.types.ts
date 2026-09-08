import type * as v from 'valibot';
import type { schema, vSelectorVariablePatternContext, vSelectorVariablePatternResolver } from './selector-variable-pattern.schema';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Context passed to the variable naming resolver.
 */
export type SelectorVariablePatternContext = v.InferInput<typeof vSelectorVariablePatternContext>;

/**
 * A resolved BEM selector exposed to the naming resolver.
 */
export type SelectorVariablePatternSelector = SelectorVariablePatternContext['selector'];

/**
 * SASS variable exposed to the naming resolver.
 */
export type SelectorVariablePatternVariable = SelectorVariablePatternContext['variable'];

/**
 * Selector that owns the SASS variable declaration.
 */
export type SelectorVariablePatternOwner = Exclude<SelectorVariablePatternContext['owner'], null>;


/**
 * Resolves the expected variable name or naming pattern for a BEM selector.
 *
 * A string is an exact expected name without the leading `$`.
 * A regular expression validates the variable name without enabling autofix.
 * A nullish result skips the variable.
 */
export type SelectorVariablePatternResolver = v.InferInput<typeof vSelectorVariablePatternResolver>;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
