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
 * Formatting provenance retained after named groups expand into ranks.
 */
export type PreparedOrderSpacing = OrderGroupSpacing & {
	/**
	 * Distinguishes adjacent groups even if their formatting options coincide.
	 */
	key: string;

	/**
	 * Required authored declaration count for threshold spacing.
	 */
	threshold: number;
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
	 * Separates local priorities of property groups sharing an outer rank.
	 */
	innerScope?: string;

	/**
	 * Separates property priorities of groups sharing a category-local rank.
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
	 * Diagnostic label supplied by the selected explicit rule matcher.
	 */
	label?: string;

	/**
	 * Optional formatting of this unit at its current semantic level.
	 */
	spacing?: PreparedOrderSpacing;
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
	 * Distinct normalized local branches, retaining pseudo-element boundaries for selector-set matching.
	 */
	localSelectors: string[];

	/**
	 * Whether the authored or resolved selector has multiple branches, even if some are duplicates.
	 */
	isList: boolean;

	/**
	 * Canonical selector with the BEM subject represented by `&`.
	 */
	relativeSelector: string;
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
	 * Selected matcher label, kept separate from the authored header and source range.
	 */
	label?: string;
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
	spacing: Array<Array<{
		/**
		 * Authored members of this atomic unit in their final order.
		 */
		items: OrderItem[];

		/**
		 * Formatting policy selected at this semantic level.
		 */
		policy?: PreparedOrderSpacing;
	}>>;
};
