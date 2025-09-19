import type { Separators } from '#modules/shared';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = {
	/**
	 * Whether the comparison should be case-sensitive.
	 *
	 * If `true`, the file or directory name must match the block name exactly,
	 * including character case. If `false`, case is ignored.
	 *
	 * @default true
	 */
	caseSensitive?: boolean;

	/**
	 * Whether to use the name of the containing directory instead of the file name
	 * for block name comparison.
	 *
	 * This is useful when using a folder-based structure like:
	 * `/components/the-component/index.scss`
	 *
	 * @default false
	 */
	matchDirectory?: boolean;

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
	 * This allows the rule to work correctly with non-standard BEM naming conventions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;

	/**
	 * Custom message functions for rule violations.
	 * If provided, overrides the default error messages.
	 */
	messages?: {
		/**
		 * Custom message for when the name does not match the block name.
		 *
		 * @param   entity      Either `'file'` or `'directory'`, depending on which name is being checked.
		 * @param   blockName   The name of the BEM block.
		 *
		 * @returns             The error message to report.
		 */
		match?: (entity: 'file' | 'directory', blockName: string) => string;

		/**
		 * Custom message for when the name matches the block name structurally
		 * but fails due to case mismatch (if `caseSensitive: true`).
		 *
		 * @param   entity      Either `'file'` or `'directory'`, depending on which name is being checked.
		 * @param   blockName   The name of the BEM block.
		 *
		 * @returns             The error message to report.
		 */
		matchCase?: (entity: 'file' | 'directory', blockName: string) => string;
	};
};
