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
	 * Custom message functions for rule violations.
	 */
	messages?: {
		/**
		 * Custom message for a BEM entity grouped with another declaration owner.
		 *
		 * @param   entity   Grouped BEM entity.
		 * @param   owner    First BEM entity in the selector list.
		 *
		 * @returns          The error message to report.
		 */
		grouped?: (entity: string, owner: string) => string;

		/**
		 * Custom message for a grouped BEM entity that is declared outside its selector group.
		 *
		 * @param   entity   Redeclared grouped BEM entity.
		 * @param   line     Line of the matching external declaration.
		 *
		 * @returns          The error message to report.
		 */
		redeclared?: (entity: string, line: number) => string;
	};

	/**
	 * Whether to reject every selector list that targets different BEM entities.
	 * When disabled, grouping is allowed until a grouped entity is declared outside the group's lexical subtree.
	 *
	 * @default false
	 */
	strict?: boolean;

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;
};
