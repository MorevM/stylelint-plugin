import type { Node } from 'postcss';

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
	};
};

/**
 * Extra metadata returned alongside resolved selectors,
 * containing the exact values that were substituted in place of `&`.
 */
export type AmpersandValues = {
	/**
	 * All unique values that replaced the `&` symbol
	 * at the level of the originally resolved node.
	 */
	ampersandValues: string[];
};
