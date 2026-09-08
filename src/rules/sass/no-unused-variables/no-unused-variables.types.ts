import type { Declaration } from 'postcss';
import type * as v from 'valibot';
import type { schema } from './no-unused-variables.schema';

/**
 * Represents a local scope for SASS variable tracking.
 *
 * Each scope corresponds to a specific PostCSS node (e.g. a rule or at-rule),
 * and contains the variables declared within it, as well as the names of variables
 * that were referenced in that scope or any of its descendants.
 */
export type Scope = {
	/**
	 * A map of declared variable names to their corresponding declaration nodes.
	 *
	 * @example
	 * Map {
	 *   "$foo" => Declaration { prop: "$foo", value: "..." }
	 * }
	 */
	variables: Map<string, Declaration>;

	/**
	 * A set of variable names that were used (referenced) within this scope.
	 */
	usages: Set<string>;
};

/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
