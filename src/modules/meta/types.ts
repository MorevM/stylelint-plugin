import type { Separators } from '#modules/shared';

/**
 * Metadata describing a single Stylelint rule within the plugin.
 * Generated automatically from the actual rule sources.
 */
export type RuleMeta = {
	/**
	 * Fully qualified rule ID.
	 *
	 * @example '@morev/bem/no-side-effects'
	 */
	id: string;

	/**
	 * Logical scope of the rule.
	 * Used for grouping and documentation.
	 *
	 * @example 'base'
	 * @example 'bem'
	 * @example 'sass'
	 */
	scope: string;

	/**
	 * Short name of the rule without namespace or scope.
	 *
	 * @example 'no-side-effects'
	 */
	name: string;

	/**
	 * Human-readable description of the rule.
	 *
	 * @example 'Disallows selectors that apply styles outside the scope of the current BEM block.'
	 */
	description: string;

	/**
	 * Indicates whether the rule supports auto-fixes.
	 *
	 * @example true
	 */
	fixable: boolean;

	/**
	 * Relative path (from repo root) to the rule's documentation file.
	 *
	 * @example 'src/rules/bem/no-side-effects/no-side-effects.docs.md'
	 */
	docsPath: string;

	/**
	 * The path used by VitePress to link to the rule's documentation page.
	 *
	 * @example '/rules/bem/no-side-effects.html'
	 */
	vitepressPath: string;
};

/**
 * Type helper representing the configuration shape for a single rule.
 */
export type RuleSetting<Primary, Secondary> =
	| null
	| Primary
	| [null | Primary]
	| [null | Primary, Secondary];

export type PluginGlobals = {
	/**
	 * Global options for the plugin that may affect multiple rules.
	 */
	globals: {
		/**
		 * Defines the separators used to parse BEM class names.
		 */
		separators?: Separators;
	};
};
