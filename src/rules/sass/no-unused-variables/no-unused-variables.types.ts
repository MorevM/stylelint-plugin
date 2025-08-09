import type { Declaration } from 'postcss';

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
export type PrimaryOption = true;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = {
	/**
	 * Whether variables declared at the root level should also be checked.
	 * By default, root-level variables are ignored,
	 * assuming they may be imported elsewhere.
	 *
	 * @default false
	 */
	checkRoot?: boolean;

	/**
	 * A list of variable names to ignore (without leading `$`).
	 * Supports both exact string matches and wildcard patterns.
	 *
	 * @example ['my-var']
	 *
	 * @default []
	 */
	ignore?: Array<string | RegExp>;

	/**
	 * Custom message functions for rule violations.
	 * If provided, overrides the default error messages.
	 */
	messages?: {
		/**
		 * Custom message for an unused variable violation.
		 *
		 * @param   name   Variable name (with leading `$`).
		 *
		 * @returns        The error message to report.
		 */
		unused?: (name: string) => string;
	};
};
