import type { AtRule, Declaration } from 'postcss';

export type DeclarationWithAtRulePath = {
	/**
	 * The declaration node itself.
	 */
	declaration: Declaration;

	/**
	 * Path of ancestor at-rules enclosing the declaration,
	 * ordered from the outermost to the innermost at-rule.
	 * Empty array means the declaration is a direct child of the rule.
	 */
	atRulePath: AtRule[];
};

/**
 * Available modes for collecting declarations from a `Rule` or `AtRule`.
 */
export type Options =
	| {
		/**
		 * Collects all declarations recursively, regardless of their nesting level.
		 *
		 * Uses `.walkDecls()` under the hood.
		 */
		mode: 'deep';
		shape: never;
	}
	| {
		/**
		 * Collects only direct child declarations of the node.
		 */
		mode: 'direct';
		shape: never;
	}
	| {
		/**
		 * Collects direct child declarations plus declarations from
		 * nested pure at-rules (at-rules containing no `Rule` nodes).
		 *
		 * This is useful for cases like `@font-face`, `@page`, `@keyframes`,
		 * or nested conditional groups like `@supports` / `@media` that wrap
		 * declarations without introducing selector rules.
		 */
		mode: 'directWithPureAtRules';

		/**
		 * Defines the return shape:
		 * - `'nodes'` — returns a flat array of `Declaration` nodes.
		 * - `'withPath'` — returns `DeclarationWithAtRulePath[]`, which keeps
		 * track of the chain of at-rules leading to each declaration.
		 */
		shape: 'nodes' | 'withPath';
	};
