import type { ChildNode } from 'postcss';
import type { OrderCategory, OrderGroupSpacing, OrderSorter, OrderSortItem } from './order.types';

/**
 * Executable sorting policy with optional exclusions from its diagnostic comparison.
 */
export type PreparedOrderSorter = {
	/**
	 * Produces a permutation of the original sibling descriptions.
	 */
	run: OrderSorter;

	/**
	 * Identifies unresolved preset values whose slots and diagnostics should be left alone.
	 */
	isIgnored?: (item: OrderSortItem) => boolean;
};

/**
 * Identity of a consecutive group and its optional formatting policy.
 */
export type PreparedOrderSpacing = OrderGroupSpacing & {
	/**
	 * Distinguishes adjacent groups even if their formatting options coincide.
	 */
	key: string;

	/**
	 * Narrower run selected by a rule or at-rule matcher inside this named group.
	 */
	member?: PreparedOrderSpacing;
};

/**
 * Display label selected for an authored item or one of its enclosing families.
 */
export type OrderLabel = {
	/**
	 * Configured text to display in diagnostics.
	 */
	text: string;

	/**
	 * Precedence of the label's source across nested semantic families.
	 */
	priority: number;
};

/**
 * Independent ordering dimensions and the policy belonging to a matched unit.
 */
export type OrderRank = {
	/**
	 * Position among categories and outer groups; null retains the original slot.
	 */
	outer: number | null;

	/**
	 * Position within the selected category or outer property group.
	 */
	inner: number | null;

	/**
	 * Property priority inside an inline category-local group.
	 */
	member: number;

	/**
	 * Keeps category and property priorities within their own slots at the same outer rank.
	 */
	innerScope?: string;

	/**
	 * Separates category-local property priorities and preserves named groups for matcher sorting.
	 */
	memberScope?: string;

	/**
	 * Semantic category retained even when an explicit matcher supplies the rank.
	 */
	category: OrderCategory;

	/**
	 * Prepared sorter for equally ranked members.
	 */
	sort?: PreparedOrderSorter;

	/**
	 * Configuration path identifying the sorter and its independent batch.
	 */
	sortScope?: string;

	/**
	 * Named group exposed to callback metadata.
	 */
	group?: string;

	/**
	 * Diagnostic label of the matched item at this semantic level.
	 */
	label?: OrderLabel;

	/**
	 * Group selected for this unit at its current semantic level.
	 */
	spacing: PreparedOrderSpacing;

	/**
	 * Category-wide formatting used where the group leaves a boundary unspecified.
	 */
	categorySpacing?: PreparedOrderSpacing;
};

/**
 * One level of the semantic family hierarchy.
 */
export type Family = {
	/**
	 * Local BEM part or canonical context/pseudo-element name exposed to custom sorting.
	 */
	name: string;

	/**
	 * Canonical identity within its parent family.
	 */
	key: string;

	/**
	 * Category that positions the complete family in its parent.
	 */
	category: OrderCategory;
};

/**
 * Selector classification collected before any source nodes move.
 */
export type SelectorOrder = {
	/**
	 * Ancestors from the block down to context and pseudo-element families.
	 */
	path: Family[];

	/**
	 * Applicable local conditions, excluding the generic rule fallback.
	 * Lists prefer categories common to every branch, or their union when none are shared.
	 */
	categories: OrderCategory[];

	/**
	 * Literal local conditions for category-local matching.
	 */
	tokens: string[];

	/**
	 * States attached to the final pseudo-element. A list qualifies only when every branch does.
	 * Lists expose no individual state tokens for whole-rule matching.
	 */
	pseudoElementStates?: string[];

	/**
	 * Distinct normalized local branches, retaining pseudo-element boundaries for selector-set matching.
	 */
	localSelectors: string[];

	/**
	 * Whether the authored or resolved selector has multiple branches, even if some are duplicates.
	 */
	isList: boolean;

	/**
	 * Canonical selector with the BEM subject represented by `&`, when it has one.
	 */
	relativeSelector?: string;
};

/**
 * Authored node and its attached comments, moved as one unit.
 */
export type OrderItem = {
	/**
	 * Node used for matching and diagnostics.
	 */
	node: ChildNode;

	/**
	 * Original nodes, including leading and trailing comments.
	 */
	nodes: ChildNode[];

	/**
	 * Semantic selector classification, if the target is unambiguous.
	 */
	selector?: SelectorOrder;

	/**
	 * Category and name used to order CSS and Sass at-rules within their category.
	 */
	atRuleMember?: {
		/**
		 * Semantic category for this definition, query, call, or diagnostic statement.
		 */
		category: 'sass:functions' | 'sass:mixins' | 'sass:includes' | 'sass:diagnostics'
			| 'css:functions' | 'css:mixins' | 'css:media' | 'css:container';

		/**
		 * Declared name, qualified call name, or directive name for queries and diagnostics.
		 */
		name: string;
	};

	/**
	 * Selected matcher label, kept separate from the authored header and source range.
	 */
	label?: OrderLabel;
};

/**
 * Rank comparisons collected independently of physical movements through ignored slots.
 */
export type OrderScopes = {
	/**
	 * Whether any level contains unmatched units whose slots must be preserved.
	 */
	hasIgnored: boolean;

	/**
	 * Original and target projections containing only units managed by that ordering level.
	 */
	sequences: Array<{
		/**
		 * Managed authored items in source order.
		 */
		items: OrderItem[];

		/**
		 * The same identities ordered only by this level's managed ranks.
		 */
		sorted: OrderItem[];
	}>;

	/**
	 * Sibling projections used to format group boundaries after the final moves.
	 */
	spacing: Array<{
		/**
		 * Semantic depth used to give parent projections ownership of cross-family boundaries.
		 */
		depth: number;

		/**
		 * Atomic sibling units at this semantic level.
		 */
		units: Array<{
			/**
			 * Authored members of this atomic unit in their final order.
			 */
			items: OrderItem[];

			/**
			 * Formatting policy selected at this semantic level.
			 */
			policy: PreparedOrderSpacing;

			/**
			 * Formatting shared across consecutive members of the category.
			 */
			categorySpacing?: PreparedOrderSpacing;
		}>;
	}>;
};
