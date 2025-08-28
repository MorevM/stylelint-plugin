import type { Severity } from 'stylelint';
import type { Separators } from '#modules/shared';

/**
 * Types supported by every rule to ensure compatibility with Stylelint.
 *
 * @see https://stylelint.io/user-guide/configure/#rules
 */
export type StylelintSecondaryOptions = {
	/**
	 * You can set the `disableFix` secondary option to disable autofix on a per-rule basis.
	 *
	 * @see https://stylelint.io/user-guide/configure/#disablefix
	 *
	 * @example
	 * ```js
	 * {
	 *   rules: {
	 *     '@morev/bem/selector-pattern': [true, {
	 *       disableFix: true,
	 *     }],
	 *   },
	 * }
	 * ```
	 */
	disableFix?: boolean;

	/**
	 * It's best to customize all messages through the `messages` option, which is available in every rule. \
	 * The option is included to preserve formal alignment with Stylelint's core behavior and is not recommended for use.
	 *
	 * @see https://stylelint.io/user-guide/configure/#message
	 */
	message?: string | ((...args: any[]) => string);

	/**
	 * You can use the `url` secondary option to provide a custom link to external docs.
	 * These urls can then be displayed in custom formatters.
	 *
	 * @see https://stylelint.io/user-guide/configure/#url
	 *
	 * @example
	 * ```js
	 * {
	 *   rules: {
	 *     '@morev/bem/selector-pattern': [true, {
	 *       url: 'https://your-docs.com/guide/how-to-use-bem/',
	 *     }],
	 *   },
	 * }
	 * ```
	 */
	url?: string;

	/**
	 * You can set the `reportDisables` secondary option to report any `stylelint-disable`
	 * comments for this rule, effectively disallowing authors to opt-out of it.
	 *
	 * @see https://stylelint.io/user-guide/configure/#reportdisables
	 *
	 * @example
	 * ```js
	 * {
	 *   rules: {
	 *     '@morev/bem/selector-pattern': [true, {
	 *       reportDisables: true,
	 *     }],
	 *   },
	 * }
	 * ```
	 */
	reportDisables?: boolean;

	/**
	 * You can use the `severity` secondary option to adjust any specific rule's severity. \
	 * It is possible to use a function for `severity`, which would accept message arguments,
	 * allowing you to adjust the severity based on these arguments.
	 *
	 * The available values for severity are:
	 * - "warning"
	 * - "error" (default)
	 *
	 * @see https://stylelint.io/user-guide/configure/#severity
	 *
	 * @example
	 * ```js
	 * {
	 *   rules: {
	 *     '@morev/bem/selector-pattern': [true, {
	 *       severity: 'warning',
	 *     }],
	 *   },
	 * }
	 * ```
	 */
	severity?: Severity | ((...args: any[]) => Severity | null);
};

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
	 * @example '/rules/bem/no-side-effects.md'
	 */
	vitepressPath: string;

	/**
	 * The link to the rule page used by VitePress.
	 *
	 * @example '/rules/bem/no-side-effects.html'
	 */
	vitepressLink: string;
};

/**
 * Type helper representing the configuration shape for a single rule.
 */
export type RuleSetting<Primary, Secondary> =
	| null
	| Primary
	| [null | Primary]
	| [null | Primary, Secondary & StylelintSecondaryOptions];

/**
 * Global plugin settings that may apply to multiple rules.
 */
export type PluginGlobals = {
	/**
	 * Defines the separators used to parse BEM class names.
	 */
	separators?: Separators;
};
