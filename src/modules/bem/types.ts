/* eslint-disable @typescript-eslint/no-use-before-define -- Cross dependencies */
import type { AtRule, Rule } from 'postcss';
import type parser from 'postcss-selector-parser';

/**
 * Represents a class found within a BEM segment, associated with the current BEM entity.
 * Used for contextual classification (e.g., whether the class belongs to this entity or a separate one).
 */
type BemEntityClassContext = {
	/**
	 * Contextual value of the selector in which the class appears.
	 *
	 * @example ':is'
	 * @example ':has'
	 * @example ':not'
	 * @example ':where'
	 */
	context: string | null;

	/**
	 * Parsed BEM entity of the class.
	 */
	entity: BemEntity;
};

/**
 * Identifies the role of a BEM entity part.
 */
export type EntityType = 'block' | 'element' | 'modifierName' | 'modifierValue';

/**
 * Represents a part of a BEM entity.
 */
export type BemEntityPart = {
	/**
	 * Type of entity part:
	 *
	 * @example 'block'
	 * @example 'element'
	 * @example 'modifierName'
	 * @example 'modifierValue'
	 */
	type: EntityType;

	/**
	 * Raw value of this part.
	 *
	 * @example 'the-block'
	 * @example 'element'
	 */
	value: string;

	/**
	 * Separator used before this part (e.g., `__`, `--`).
	 *
	 * @example '.'
	 * @example '__'
	 */
	separator: string;

	/**
	 * The selector of this entity. \
	 * Actually just `separator` + `value`.
	 *
	 * @example '.the-block'
	 * @example '__item'
	 */
	selector: string;

	/**
	 * Start and end indices in the original selector string, if available.
	 *
	 * @example [1, 10]
	 */
	sourceRange: [number, number] | undefined;
};


/**
 * Represents a parsed BEM entity extracted from a class selector.
 * May include block, element, modifier name, and modifier value parts.
 */
export type BemEntity = {
	/**
	 * PostCSS rule or at-rule where this entity was defined.
	 */
	rule: Rule | AtRule;

	/**
	 * Full class name of the entity, including all BEM parts.
	 *
	 * @example '.the-block__element--modifier-name--modifier-value'
	 */
	bemSelector: string;

	/**
	 * Indicates the structural or semantic context in which this BEM entity was discovered.
	 *
	 * May be one of:
	 * * A pseudo-class selector name such as `:is`, `:has`, `:not` - when the entity comes from within such constructs.
	 * * `'modifier'` - when this entity is a modifier of a previous one, e.g. `.block.block--mod`.
	 * * `'entity'` - when this entity is another standalone BEM entity used in the same selector, e.g. `.foo.bar`.
	 * - `null` — when the entity is top-level and not contextually dependent on any wrapping or neighboring selector.
	 *
	 * Used to distinguish the role and origin of the entity in compound selectors and nested structures.
	 *
	 * @example
	 * .block {
	 *   // Both entities will have sourceContext: ':is'
	 *   :is(&--mod, &__elem) {}
	 * }
	 * @example
	 *  // Second entity (modifier) will have sourceContext: 'modifier'
	 * .block.block--mod {}
	 * @example
	 * // Second entity will have sourceContext: 'entity'
	 * .foo.bar {}
	 */
	sourceContext: string | null;

	/**
	 * Parsed `block` part (always present).
	 */
	block: BemEntityPart;

	/**
	 * Optional `element` part.
	 */
	element?: BemEntityPart;

	/**
	 * Optional modifier name part.
	 */
	modifierName?: BemEntityPart;

	/**
	 * Optional modifier value part.
	 */
	modifierValue?: BemEntityPart;

	/**
	 * Contextual information about the selector this entity was found in.
	 */
	context: {
		/**
		 * ID selectors found in the same entity. \
		 * For example, selector `#foo.the-block` is valid.
		 *
		 * @example ['#foo']
		 */
		ids: string[];

		/**
		 * Tag selectors (e.g., `button`, `div`) found in the rule. \
		 * For example, selector `div.the-block` is valid.
		 *
		 * @example ['div']
		 */
		tags: string[];

		/**
		 * Attribute selectors (e.g., `[type="button"]`) found in the rule. \
		 * For example, selector `.the-block[data-attr]` is valid.
		 *
		 * @example ['[data-attr]']
		 */
		attributes: string[];

		/**
		 * Pseudo-elements (e.g., `::after`) found in the entity.
		 * For example, selector `.the-block::after`.
		 *
		 * @example ['::after']
		 */
		pseudoElements: string[];

		/**
		 * Pseudo-classes (e.g., `:hover`, `:not(...)`) found in the selector.
		 */
		pseudoClasses: parser.Pseudo[];

		/**
		 * Class-based context information.
		 */
		classes: {
			/**
			 * Other BEM entities found in the same selector. \
			 * For example, `.foo-block.bar-block` contains two entities;
			 * when processing the first, the second appears here as context.
			 */
			entities: BemEntityClassContext[];

			/**
			 * All modifier classes of the same entity. \
			 * For example, `.foo-block.foo-block--bar`.
			 */
			modifiers: BemEntityClassContext[];
		};
	};
};
