import type { AtRule, Rule } from 'postcss';
import type { BemEntityPart, EntityType } from '#modules/bem/types';

/**
 * Represents a single BEM part within a chain, extracted from a selector.
 *
 * Each item reflects the most specific entity (block, element, modifier)
 * found at a certain level of nesting. It's tied to the rule it was extracted from,
 * and includes the full resolved selector at that level.
 */
export type BemChainItem = {
	/**
	 * Type of the BEM part.
	 */
	entityType: EntityType;

	/**
	 * The specific part of the BEM entity.
	 */
	entityPart: BemEntityPart;

	/**
	 * Fully resolved selector that this entity was derived from.
	 *
	 * @example '.block__element--mod'
	 */
	bemSelector: string;

	/**
	 * The PostCSS rule or at-rule this entity belongs to.
	 * Used to trace back to original source and context.
	 */
	rule: Rule | AtRule;
};

/**
 * A complete top-down chain of BEM entities, where each deeper level
 * (e.g. modifier) is connected to the entity it logically extends from.
 *
 * @example
 * [
 *   { entityType: 'modifierName', entityPart: 'mod', ... },
 *   { entityType: 'element', entityPart: 'item', ... },
 *   { entityType: 'block', entityPart: 'button', ... }
 * ]
 */
export type BemChain = BemChainItem[];
