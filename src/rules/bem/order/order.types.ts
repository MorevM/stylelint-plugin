import type { Separators } from '#modules/shared';

/**
 * Built-in scopes whose inner order can be configured through `within`.
 * Applicability depends on the current container or selector family.
 * `base` positions the family's own rule; `declarations` positions property nodes inside rules.
 */
export type OrderCategory =
	| 'dollar-variables'
	| 'custom-properties'
	| 'declarations'
	| 'at-rules'
	| 'rules'
	| 'base'
	| 'pseudo-classes'
	| 'qualifiers:class'
	| 'qualifiers:attribute'
	| 'context:internal'
	| 'context:external'
	| 'modifiers'
	| 'pseudo-elements'
	| 'elements';

/**
 * Explicit matcher for authored at-rules.
 */
export type AtRuleMatcher = {
	/**
	 * Restricts matching to at-rules.
	 */
	type: 'at-rule';

	/**
	 * Exact at-rule name without the leading `@`; omission allows any name.
	 */
	name?: string;

	/**
	 * Exact normalized parameters as a string, or a regular expression pattern.
	 * The at-rule name is excluded; omission allows any parameters.
	 */
	parameter?: string | RegExp;

	/**
	 * Distinguishes block-form at-rules from statements; omission allows both.
	 */
	hasBlock?: boolean;
};

/**
 * Explicit matcher for authored selectors.
 */
export type RuleMatcher = {
	/**
	 * Restricts matching to selector rules.
	 */
	type: 'rule';

	/**
	 * Exact authored selector as a string, or a regular expression pattern.
	 * Omission allows any selector; strings are never compiled as regular expressions.
	 */
	selector?: string | RegExp;

	/**
	 * Parsed selector relative to its BEM subject; mutually exclusive with `selector`.
	 * Pseudo-elements retain their position, for example `&:hover::before`.
	 */
	relativeSelector?: string | RegExp;

	/**
	 * Optional descriptive label for diagnostics.
	 */
	name?: string;
};

/**
 * Immutable description of one sortable sibling, which may represent an entire selector family.
 */
export type OrderSortItem = Readonly<{
	/**
	 * Semantic families remain atomic even when they contain several authored rules.
	 */
	type: 'family' | 'rule' | 'at-rule' | 'declaration';

	/**
	 * Local family name, property name, at-rule name, or authored selector for a generic rule.
	 * Element families expose `title-icon`, without the block prefix or BEM separators.
	 */
	name: string;

	/**
	 * Category whose sibling slots this unit occupies.
	 */
	category: OrderCategory;

	/**
	 * Original sibling index within the current semantic level, before ordering.
	 */
	sourceIndex: number;

	/**
	 * Canonical family identity, such as `.card__title-icon`, when this unit is a family.
	 */
	key?: string;

	/**
	 * Authored selector of the family base or first member, or the generic rule itself.
	 */
	selector?: string;

	/**
	 * Normalized at-rule parameters without the leading at-rule name.
	 */
	parameter?: string;

	/**
	 * Declaration value without its trailing importance annotation.
	 */
	value?: string;

	/**
	 * Whether an at-rule has a body rather than a statement form.
	 */
	hasBlock?: boolean;
}>;

/**
 * Orders one category's equal-rank siblings without changing explicit priorities or family boundaries.
 * The callback must be synchronous, deterministic, and stable on its own result.
 *
 * @param   items   Frozen descriptions in their original sibling order.
 *
 * @returns         Every original description exactly once, in the desired order.
 */
export type OrderSorter = (items: readonly OrderSortItem[], context: OrderSortContext) => readonly OrderSortItem[];

/**
 * Authored container information without mutable PostCSS nodes.
 */
export type OrderSortContainer = Readonly<{
	/**
	 * Distinguishes stylesheet structure from selector and at-rule bodies.
	 */
	type: 'root' | 'rule' | 'at-rule';

	/**
	 * Authored selector when the container is a rule.
	 */
	selector?: string;

	/**
	 * At-rule name without its leading @.
	 */
	name?: string;

	/**
	 * Normalized at-rule parameters.
	 */
	parameter?: string;
}>;

/**
 * One semantic owner in the path containing the current sortable siblings.
 */
export type OrderSortFamily = Readonly<{
	/**
	 * Local entity, context, or pseudo-element name.
	 */
	name: string;

	/**
	 * Canonical identity within its parent family.
	 */
	key: string;

	/**
	 * Category that positions this family in its parent.
	 */
	category: OrderCategory;
}>;

/**
 * Immutable context shared by one batch of equally ranked siblings.
 */
export type OrderSortContext = Readonly<{
	/**
	 * Physical container, which can differ from the logical BEM family.
	 */
	container: OrderSortContainer;

	/**
	 * Complete semantic owner path; an empty path means no known BEM owner.
	 */
	family: readonly OrderSortFamily[];

	/**
	 * Category being sorted.
	 */
	category: OrderCategory;

	/**
	 * Named group, when the batch belongs to one.
	 */
	group?: string;

	/**
	 * Applies a built-in preset to original descriptions, including a selected subset.
	 * The result preserves object identities and declaration dependencies.
	 */
	sort: <T extends OrderSortItem>(items: readonly T[], preset: OrderSortPreset) => readonly T[];
}>;

/**
 * Placement of units not matched by an ordering sequence.
 * Ignored units retain their slots at that level; their descendants are still checked.
 */
export type UnspecifiedOrder = 'top' | 'bottom' | 'ignore';

/**
 * Built-in ordering for names or one unambiguous literal dimension.
 */
export type OrderSortPreset = {
	/**
	 * Compares local family, property, or at-rule names without locale-dependent collation.
	 */
	by: 'name';

	/**
	 * Direction of name comparison.
	 *
	 * @default 'asc'
	 */
	direction?: 'asc' | 'desc';
} | {
	/**
	 * Extracts exactly one literal dimension from at-rule parameters or a declaration value.
	 */
	by: 'dimension';

	/**
	 * Units in priority order; values are compared only within the same unit, without conversion.
	 * Omission or an empty list sorts each unit within its existing slots.
	 */
	units?: readonly string[];

	/**
	 * Numeric direction within each unit; explicit unit priorities remain unchanged.
	 *
	 * @default 'asc'
	 */
	direction?: 'asc' | 'desc';

	/**
	 * Placement of ambiguous dimensions, unknown units, variables, and expressions.
	 *
	 * @default 'ignore'
	 */
	unresolved?: UnspecifiedOrder;
};

/**
 * Built-in preset or project-specific permutation of equally ranked siblings.
 */
export type OrderSort = OrderSorter | OrderSortPreset;

/**
 * Empty-line policy at the beginning of a semantic group.
 */
export type EmptyLineBefore = 'always' | 'never' | 'threshold';

/**
 * Optional formatting shared by named and inline groups.
 */
export type OrderGroupSpacing = {
	/**
	 * Controls the gap before the group; the first container member has no leading gap.
	 */
	emptyLineBefore?: EmptyLineBefore;

	/**
	 * Removes empty lines between consecutive members of the group.
	 */
	noEmptyLineBetween?: boolean;

	/**
	 * Optional label used in spacing diagnostics.
	 */
	groupName?: string;
};

/**
 * Property identities or patterns in priority order; nested arrays assign equal ranks.
 */
export type PropertiesSequence = ReadonlyArray<string | RegExp | ReadonlyArray<string | RegExp>>;

/**
 * A property cohort with its own priorities, sorter, and formatting.
 * Its local configuration replaces shared declaration ordering for selected properties.
 */
export type PropertiesGroup = OrderGroupSpacing & {
	/**
	 * Selects ordinary CSS properties and defines their internal priorities.
	 */
	properties: PropertiesSequence;

	/**
	 * Orders only members with equal property priority.
	 */
	sort?: OrderSort;
};

/**
 * Named-group entry: a built-in category or explicit custom matcher.
 * Group references and the remainder marker are not allowed inside groups.
 */
export type GroupMatcher = OrderCategory | AtRuleMatcher | RuleMatcher | PropertiesGroup;

/**
 * Outer ordering entry: a built-in category, named group, remainder, or explicit custom matcher.
 * Arbitrary strings and standalone regular expressions are reserved for `within`.
 * Group references require a non-empty name, checked at runtime.
 */
export type OrderMatcher = GroupMatcher | `group:${string}` | '*';

/**
 * Object matchers take precedence over categories; nested arrays assign equal rank.
 * Named groups expand in place while preserving equal-rank entries.
 * Matching applies within the current scope without flattening child selector families.
 */
export type OrderSequence = ReadonlyArray<OrderMatcher | readonly OrderMatcher[]>;

/**
 * Non-recursive named-group sequence, including equal-rank entries.
 */
export type GroupSequence = ReadonlyArray<GroupMatcher | readonly GroupMatcher[]>;

/**
 * Unordered local selector branches belonging to the same semantic family and category.
 */
export type SelectorSetMatcher = {
	/**
	 * Matches complete branches rather than individual tokens in a compound selector.
	 * Condition order is ignored within each compound; pseudo-elements retain their boundaries.
	 */
	selectorSet: {
		/**
		 * Exact set of branches, ignoring their authored order; mutually exclusive with includes.
		 */
		equals: readonly string[];

		/**
		 * An exact set cannot also specify required branches.
		 */
		includes?: never;

		/**
		 * An exact set already determines its size.
		 */
		size?: never;
	} | {
		/**
		 * Required complete branches; additional branches are allowed.
		 */
		includes: readonly string[];

		/**
		 * Required distinct branch count, including the listed branches.
		 */
		size?: number;

		/**
		 * Required branches cannot also specify an exact set.
		 */
		equals?: never;
	};
};

/**
 * Named matcher sequence, optionally sorting equal-rank members claimed by that group.
 */
export type GroupOrder = GroupSequence | PropertiesGroup | OrderGroupSpacing & {
	/**
	 * Defines group membership and priorities; separate entries remain separate sorting batches.
	 */
	order: GroupSequence;

	/**
	 * Overrides the category sorter for this group's matched members.
	 */
	sort?: OrderSort;
};

/**
 * Category-local matcher, including compact literal strings and normalized-header regular expressions.
 * Explicit custom matcher objects are also supported; group references are rejected at runtime.
 */
export type WithinMatcher = string | RegExp | AtRuleMatcher | RuleMatcher | SelectorSetMatcher | PropertiesGroup;

/**
 * Category-local sequence whose nested arrays assign equal rank.
 */
export type WithinSequence = ReadonlyArray<WithinMatcher | readonly WithinMatcher[]>;

/**
 * Priorities for authored selector branches, excluding declaration and at-rule matchers.
 */
export type SelectorListSequence = ReadonlyArray<
	string | RegExp | RuleMatcher | ReadonlyArray<string | RegExp | RuleMatcher>
>;

/**
 * Composes a replacement category order without mutating its built-in defaults.
 * This callback transforms configuration data rather than matching CSS nodes.
 *
 * @param   defaults   Readonly built-in order, including equal-rank entries.
 *
 * @returns            Replacement order for the same category.
 */
export type OrderTransformer = (defaults: WithinSequence) => WithinSequence;

/**
 * Category ordering with an explicit policy for unmatched members.
 */
export type WithinOrderOptions = {
	/**
	 * Replaces the category defaults, optionally deriving a sequence from them.
	 */
	order?: WithinSequence | OrderTransformer;

	/**
	 * Positions unmatched members or preserves their category-local slots.
	 * An explicit `*` matches the remainder before this policy applies.
	 *
	 * @default 'bottom'
	 */
	unspecified?: UnspecifiedOrder;

	/**
	 * Orders matched members with equal inner rank, keeping unspecified units outside the callback.
	 */
	sort?: OrderSort;

	/**
	 * Formats unmatched members when their placement is top or bottom.
	 */
	emptyLineBeforeUnspecified?: EmptyLineBefore;

	/**
	 * Minimum number of ordinary CSS declarations in the authored container for a threshold gap.
	 */
	emptyLineMinimumPropertyThreshold?: number;
};

/**
 * Orders authored comma-separated selector branches independently from rule placement.
 */
export type SelectorListOrder = {
	/**
	 * Inherits category priorities for compatible BEM branches or uses an explicit local sequence.
	 */
	order?: 'inherit' | SelectorListSequence;

	/**
	 * Placement of unmatched branches.
	 *
	 * @default 'ignore'
	 */
	unspecified?: UnspecifiedOrder;

	/**
	 * Optional name ordering of equally ranked branches, with an ascending default direction.
	 */
	sort?: Extract<OrderSortPreset, { by: 'name' }>;
};

/**
 * Replaces a category's defaults directly or derives a replacement from them.
 */
export type WithinOrder = WithinSequence | OrderTransformer | WithinOrderOptions;

/**
 * Enables semantic ordering and autofix within authored containers.
 */
export type PrimaryOption = true;

/**
 * Shared ordering configuration for flat CSS, nested content, and selector families.
 * Families retain their first-appearance order unless a category override ranks them.
 */
export type SecondaryOption = {
	/**
	 * Applies recursively inside selectors and semantic families.
	 * Inapplicable categories are skipped; peer families retain first-appearance order.
	 * Pseudo-element variants stay in their pseudo-element family, including `&:hover::before`.
	 */
	order?: OrderSequence;

	/**
	 * Placement of units not matched by `order`, also inherited by the document order.
	 *
	 * @default 'bottom'
	 */
	unspecified?: UnspecifiedOrder;

	/**
	 * Structural ordering at stylesheet level, outside selector bodies.
	 * Category overrides and named groups are shared with the main order.
	 */
	root?: {
		/**
		 * Positions whole selector families and at-rule wrappers.
		 * Does not replace the main order inside a semantic family.
		 *
		 * @default Sass constructs, custom properties, selector families, then other at-rules.
		 */
		order?: OrderSequence;

		/**
		 * Overrides the shared unmatched-unit policy at stylesheet level.
		 */
		unspecified?: UnspecifiedOrder;
	};

	/**
	 * Overrides inner category orders without changing their position or membership.
	 * Accepts literal strings and regular expressions in addition to explicit matcher objects.
	 * Omitted categories use their built-in defaults.
	 */
	within?: Readonly<Partial<Record<OrderCategory, WithinOrder>>>;

	/**
	 * Non-recursive sequences referenced by `group:name` from `order` or `root.order`.
	 * Definitions exclude group references and the remainder marker; custom matchers use object form.
	 */
	groups?: Readonly<Record<string, GroupOrder>>;

	/**
	 * Opt-in branch ordering; it never grants permission to move the whole selector rule.
	 *
	 * @default false
	 */
	selectorList?: false | SelectorListOrder;

	/**
	 * Shared threshold for group gaps, overridden by category-local formatting settings.
	 */
	emptyLineMinimumPropertyThreshold?: number;

	/**
	 * BEM separators used to identify selector families and contextual conditions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;
};
