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
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;

	/**
	 * Custom message functions for rule violations.
	 */
	messages?: {
		/**
		 * Custom message for styles declared outside their target BEM entity.
		 *
		 * @param   target   Target BEM entity.
		 * @param   owner    BEM entity that currently owns the styles, if any.
		 *
		 * @returns          The error message to report.
		 */
		misplaced?: (target: string, owner: string | undefined) => string;
	};
};
