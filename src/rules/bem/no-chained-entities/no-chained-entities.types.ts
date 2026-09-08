import type { AtRule, Rule } from 'postcss';
import type * as v from 'valibot';
import type { BemEntityPart, EntityType } from '#modules/bem';
import type { schema } from './no-chained-entities.schema';

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
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
