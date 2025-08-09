import type { AtRule, Rule } from 'postcss';
import type { BemEntityPart, EntityType } from '#modules/bem';
import type { Separators } from '#modules/shared';

/**
 * Represents a single BEM entity within a repeating group that violates the rule.
 */
export type RepeatingGroupItem = {
	/**
	 * Type of BEM entity
	 */
	type: EntityType;

	/**
	 * Metadata about this entity.
	 */
	part: BemEntityPart;

	/**
	 * The full BEM selector string for this entity.
	 */
	selector: string;

	/**
	 * The rule or at-rule in which this entity was defined.
	 */
	rule: Rule | AtRule;
};

/**
 * A violation.
 */
export type Violation = {
	/**
	 * Type of the BEM entity that caused the violation,
	 * or a special case `nestedModifierValue`.
	 */
	type: EntityType | 'nestedModifierValue';

	/**
	 * Actually used selector for this part.
	 */
	actual: string;

	/**
	 * Suggested correct selector for this part.
	 */
	expected: string;

	/**
	 * The PostCSS node (rule or at-rule) where the violation occurred.
	 */
	node: Rule | AtRule;

	/**
	 * Start index of the violation range in the original selector.
	 */
	index: number;

	/**
	 * End index of the violation range in the original selector.
	 */
	endIndex: number;
};

/**
 * A group of BEM entities of the same type that are improperly chained via `&`.
 */
export type RepeatingGroup = {
	/**
	 * The PostCSS rule or at-rule containing the group.
	 */
	rule: Rule | AtRule;

	/**
	 * List of repeating BEM entities of the same type.
	 */
	repeating: RepeatingGroupItem[];

	/**
	 * Optional entity part that follows the repeating group
	 * (used to suggest correct form).
	 */
	nextPart: BemEntityPart | undefined;

	/**
	 * The canonical BEM selector associated with the group.
	 */
	bemSelector: string;
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
	 * Whether to disallow nesting for modifier values:
	 *
	 * @example
	 * ```scss
	 * .block {
	 *   &--theme {
	 *     &--dark {} // ⛔ disallowed if true
	 *   }
	 * }
	 * ```
	 * Instead, enforce writing as:
	 *
	 * ```scss
	 * .block {
	 *   &--theme--dark {} // ✅ flat
	 * }
	 * ```
	 *
	 * @default false
	 */
	disallowNestedModifierValues?: boolean;

	/**
	 * Custom message functions for each violation type.
	 * If provided, overrides the default error messages.
	 */
	messages?: {
		/**
		 * Custom message for chained BEM block violations.
		 *
		 * @param   actual     Actual BEM selector found in the source code.
		 * @param   expected   Expected BEM selector.
		 *
		 * @returns            Error message.
		 */
		block?: (actual: string, expected: string) => string;

		/**
		 * Custom message for chained BEM element violations.
		 *
		 * @param   actual     Actual BEM selector found in the source code.
		 * @param   expected   Expected BEM selector.
		 *
		 * @returns            Error message.
		 */
		element?: (actual: string, expected: string) => string;

		/**
		 * Custom message for chained BEM modifier violations.
		 *
		 * @param   actual     Actual BEM selector found in the source code.
		 * @param   expected   Expected BEM selector.
		 *
		 * @returns            Error message.
		 */
		modifierName?: (actual: string, expected: string) => string;

		/**
		 * Custom message for chained BEM modifier value violations.
		 *
		 * @param   actual     Actual BEM selector found in the source code.
		 * @param   expected   Expected BEM selector.
		 *
		 * @returns            Error message.
		 */
		modifierValue?: (actual: string, expected: string) => string;

		/**
		 * Custom message for nested BEM modifier values.
		 *
		 * @param   actual     Actual BEM selector found in the source code.
		 * @param   expected   Expected BEM selector.
		 *
		 * @returns            Error message.
		 */
		nestedModifierValue?: (actual: string, expected: string) => string;
	};

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
	 * This allows the rule to work correctly with non-standard BEM naming conventions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;
};
