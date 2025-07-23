/* eslint-disable @typescript-eslint/no-use-before-define -- Cross dependencies */
import type { AtRule, Rule } from 'postcss';
import type parser from 'postcss-selector-parser';
import type { Pseudo } from 'postcss-selector-parser';
import type { Separators } from '#types';

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
 * Enhanced `postcss-selector-parser` node, for internal usage only.
 */
export type BemNode<Base = parser.Node> = Base & {
	/**
	 * Adjusted `sourceIndex` of the node, accounting for injected content
	 * during selector resolution (e.g., replacing `&` with parent selector).
	 *
	 * Used to align original and resolved selector nodes when their positions differ.
	 */
	adjustedSourceIndex?: number;

	/**
	 * Offset applied due to contextual constructs like `@at-root` or `@nest`.
	 * Used when computing absolute source positions of nested nodes.
	 */
	offset?: number;

	/**
	 * Metadata linking a resolved selector node back to its source
	 * in the original (potentially nested) selector.
	 */
	origin: {
		/**
		 * Whether this node overlaps with any part of the source selector.
		 */
		sourceMatched: boolean;

		/**
		 * Whether this node exactly matches the full value of a source node.
		 */
		sourceFullyMatched: boolean;

		/**
		 * Source fragments this node corresponds to (can be partial overlaps).
		 */
		originalMatches: Array<{
			/**
			 * The string value of the matched source node.
			 *
			 * @example '__item'
			 */
			value: string;

			/**
			 * Index range in the original source string (raw selector).
			 *
			 * @example [1, 7]
			 */
			sourceRange: [number, number];

			/**
			 * Offset applied due to surrounding context (e.g., from `@at-root` or `@nest`).
			 */
			offset: number;
		}>;
	};
};

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
	sourceIndices: [number, number] | undefined;
};

/**
 * Options used to parse or resolve BEM entities from selectors.
 * Can include either a rule node from PostCSS, or a raw selector string.
 */
export type Options = {
	/**
	 * PostCSS rule or at-rule providing the context for the selector.
	 */
	rule: Rule | AtRule;

	/**
	 * Optional raw selector string (overrides rule.selector if provided).
	 *
	 * @example '&__custom-element'
	 */
	source?: string;

	/**
	 * Set of BEM separators to use for parsing.
	 */
	separators: Separators;
} | {
	/**
	 * Raw selector string.
	 *
	 * @example '.block__item--mod'
	 */
	source: string;

	/**
	 * Set of BEM separators to use for parsing.
	 */
	separators: Separators;
};

/**
 * Identifies the role of a BEM entity part.
 */
export type EntityType = 'block' | 'element' | 'modifierName' | 'modifierValue';

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
		pseudoClasses: Pseudo[];

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
