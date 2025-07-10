import type { Node } from 'postcss';

/**
 * Represents a fully resolved selector from a nested context.
 */
export type ResolvedSelector = {
	/**
	 * The original (unresolved) selector string.
	 *
	 * @example '&--mod'
	 */
	raw: string;

	/**
	 * The final resolved selector string.
	 *
	 * @example '.block--mod'
	 */
	resolved: string;

	/**
	 * The value substituted in place of `&` during resolution,
	 * or `null` if `&` was not present in the original selector.
	 */
	inject: string | null;
};

/**
 * Options for resolving a nested selector.
 */
export type Options = {
	/**
	 * The selector to resolve. If not provided, will be inferred from the given `node`
	 * (`Rule.selector` or `AtRule.params`).
	 */
	selector?: string;

	/**
	 * The PostCSS node at which resolution begins.
	 */
	node: Node;

	/**
	 * Internal metadata used during recursive resolution.
	 * Not intended for external use.
	 */
	_internal?: {
		/**
		 * Set of visited selector + node combinations to prevent infinite recursion.
		 */
		_seen?: Set<string>;

		/**
		 * The original node being resolved (remains the same across recursion).
		 * Used to determine which level is the "current" scope for resolving ampersands.
		 */
		initialNode?: Node;

		/**
		 * The child selector that originated the current resolution step.
		 * Used to preserve the original unresolved form (`raw`) during recursive processing.
		 */
		childSelector?: string;
	};
};
