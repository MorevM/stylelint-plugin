import type { ExclusifyUnion, RequireAtLeastOne } from 'type-fest';
import type { Separators } from '#modules/shared';

/**
 * Display text for a configured entity in lint messages.
 */
type DiagnosticLabel = {
	/**
	 * Describes the matched items independently of their source spelling.
	 */
	label?: string;
};

/**
 * Built-in scopes whose inner order can be configured through `categories`.
 * Applicability depends on the current container or selector family.
 * `base` positions the family's own rule; `declarations` positions property nodes inside rules.
 */
export type OrderCategory =
	| 'sass:variables'
	| 'sass:functions'
	| 'sass:mixins'
	| 'sass:includes'
	| 'sass:include-statements'
	| 'sass:include-blocks'
	| 'sass:diagnostics'
	| 'sass:placeholders'
	| 'css:functions'
	| 'css:mixins'
	| 'css:media'
	| 'css:container'
	| 'custom-properties'
	| 'declarations'
	| 'at-rules'
	| 'rules'
	| 'base'
	| 'pseudo-classes'
	| 'pseudo-classes:pseudo-element'
	| 'qualifiers'
	| 'qualifiers:class'
	| 'qualifiers:attribute'
	| 'qualifiers:type'
	| 'context:internal'
	| 'context:external'
	| 'modifiers'
	| 'pseudo-elements'
	| 'elements';

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
	 * CSS and Sass definitions expose the declared name. Sass includes expose the called name, including its namespace.
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
 * Orders equal-rank siblings without changing explicit priorities or family boundaries.
 * The callback must be synchronous, deterministic, and stable on its own result.
 *
 * @param   items     Frozen descriptions in their original sibling order.
 * @param   context   Container, semantic owner and built-in sorting presets for this batch.
 *
 * @returns           Every original description exactly once, in the desired order.
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
 * Whether an authored group boundary requires, forbids or preserves empty lines.
 */
export type BlankLineMode = 'always' | 'never' | 'ignore';

/**
 * Where to count direct non-comment nodes for a spacing condition.
 * Neighboring groups are relative to the group that owns the policy.
 */
export type BlankLineItemScope = 'container' | 'group' | 'previous-group' | 'next-group';

/**
 * A condition on a spacing boundary, or a boolean combination of other conditions.
 */
export type BlankLineCondition =
	| 'first-nested'
	| 'last-nested'
	| 'inside-single-line-block'
	| 'separated-by-comment'
	| ({
		/**
		 * Inclusive lower bound on the number of items.
		 */
		minItems: number;
	} | {
		/**
		 * Inclusive upper bound on the number of items.
		 */
		maxItems: number;
	}) & {
		/**
		 * Counts direct items in the authored container or in a final consecutive group.
		 *
		 * @default 'group'
		 */
		scope?: BlankLineItemScope;
	}
	| {
		/**
		 * Matches when at least one condition matches.
		 */
		any: readonly [BlankLineCondition, ...BlankLineCondition[]];
	}
	| {
		/**
		 * Matches when every condition matches.
		 */
		all: readonly [BlankLineCondition, ...BlankLineCondition[]];
	}
	| {
		/**
		 * Matches when the nested condition fails.
		 */
		not: BlankLineCondition;
	};

/**
 * One conditional decision for a spacing boundary.
 */
export type BlankLineRule = {
	/**
	 * Condition evaluated in the context of this boundary.
	 */
	when: BlankLineCondition;

	/**
	 * Formatting to apply when this is the first matching rule.
	 */
	mode: BlankLineMode;
};

/**
 * Formatting chosen unconditionally or by the first matching rule.
 */
export type BlankLinePolicy = BlankLineMode | {
	/**
	 * Formatting for a boundary that matches no rule.
	 *
	 * @default 'ignore'
	 */
	default?: BlankLineMode;

	/**
	 * Conditions in priority order.
	 */
	rules: readonly [BlankLineRule, ...BlankLineRule[]];
};

/**
 * Formatting at the edges of a group and between its consecutive members.
 * Omitted policies preserve authored whitespace.
 */
export type BlankLines = {
	/**
	 * Formats the boundary before the group, including its leading attached comments.
	 * Takes precedence over the preceding group's after policy at the same semantic level.
	 */
	before?: BlankLinePolicy;

	/**
	 * Formats the boundary after the group, including its trailing attached comments.
	 * At the end of a nested container, applies before its closing brace.
	 */
	after?: BlankLinePolicy;

	/**
	 * Formats boundaries between physically adjacent members of the same group.
	 */
	between?: BlankLinePolicy;
};

/**
 * Placement and formatting of genuinely unmatched members; an explicit wildcard remains matched.
 */
export type UnspecifiedOrderOptions = DiagnosticLabel & {
	/**
	 * Places unmatched members before or after explicitly selected members.
	 */
	position: Exclude<UnspecifiedOrder, 'ignore'>;

	/**
	 * Formats the unmatched group without including it in matched sorting batches.
	 */
	blankLines?: BlankLines;
};

/**
 * Optional formatting for a named group or a run of items selected by one matcher.
 */
export type OrderGroupSpacing = DiagnosticLabel & {
	/**
	 * Controls empty lines at the group's edges and between its consecutive members.
	 */
	blankLines?: BlankLines;
};

/**
 * Explicit matcher for authored at-rules.
 */
export type AtRuleMatcher = OrderGroupSpacing & {
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
	 * Strings are normalized on both sides; patterns receive normalized source parameters.
	 * The at-rule name is excluded; omission allows any parameters.
	 */
	parameter?: string | RegExp;

	/**
	 * Distinguishes block-form at-rules from statements; omission allows both.
	 */
	hasBlock?: boolean;

	/**
	 * Orders matching at-rules that share a priority.
	 */
	sort?: OrderSort;
};

/**
 * Category shorthand for matching selector-set membership or branch count.
 */
export type SelectorSetMatcher = DiagnosticLabel & {
	/**
	 * Matches complete branches rather than individual tokens in a compound selector.
	 * Condition order is ignored within each compound; pseudo-elements retain their boundaries.
	 */
	selectorSet: ExclusifyUnion<RequireAtLeastOne<{
		/**
		 * Local branches that must be present.
		 */
		includes?: readonly string[];

		/**
		 * Inclusive lower bound on the number of distinct branches.
		 */
		minSize?: number;

		/**
		 * Inclusive upper bound on the number of distinct branches.
		 */
		maxSize?: number;
	}> | {
		/**
		 * Exact set of local branches in any order.
		 */
		equals: readonly string[];
	} | {
		/**
		 * Exact number of distinct branches.
		 */
		size: number;

		/**
		 * Local branches that must be present.
		 */
		includes?: readonly string[];
	}>;
};

/**
 * Explicit matcher for authored selectors.
 */
export type RuleMatcher = OrderGroupSpacing & {
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
	 * Matches a rule by its distinct branch count or by local branches within one BEM family.
	 * Can be combined with either authored or relative selector text.
	 */
	selectorSet?: SelectorSetMatcher['selectorSet'];

	/**
	 * Orders matching rules or selector families that share a priority.
	 */
	sort?: OrderSort;
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
 * Arbitrary strings and standalone regular expressions belong in category orders other than `at-rules`.
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
 * Named matcher sequence, optionally sorting equal-rank members claimed by that group.
 */
export type GroupOrder = GroupSequence | PropertiesGroup | OrderGroupSpacing & {
	/**
	 * Defines group membership and priorities; separate entries remain separate sorting batches.
	 */
	order: GroupSequence;

	/**
	 * Orders equally ranked group members that share this sorter.
	 */
	sort?: OrderSort;
};

/**
 * Category-local matcher for property names, selector tokens, patterns and structured constraints.
 * The generic at-rule category requires structured matchers. Query categories also accept conditions.
 */
export type CategoryMatcher = string | RegExp | AtRuleMatcher | RuleMatcher | SelectorSetMatcher | PropertiesGroup;

/**
 * At-rule constraints use explicit fields, with a wildcard for the remaining at-rules.
 */
export type AtRuleCategoryMatcher = AtRuleMatcher | '*';

/**
 * Exact query parameters, a pattern over them, or an explicit at-rule constraint.
 */
export type QueryCategoryMatcher = string | RegExp | AtRuleMatcher;

/**
 * Category-local sequence whose nested arrays assign equal rank.
 */
export type CategorySequence<Matcher extends CategoryMatcher = CategoryMatcher> =
	ReadonlyArray<Matcher | readonly Matcher[]>;

/**
 * Priorities for authored selector branches, excluding declaration and at-rule matchers.
 */
export type SelectorListSequence = CategorySequence<string | RegExp | Omit<RuleMatcher, 'sort' | 'blankLines' | 'selectorSet'>>;

/**
 * Ordering and formatting for a built-in category.
 */
export type CategoryOrderOptions<Matcher extends CategoryMatcher = CategoryMatcher> = DiagnosticLabel & {
	/**
	 * Replaces the category's built-in order.
	 */
	order?: CategorySequence<Matcher>;

	/**
	 * Positions unmatched members or preserves their category-local slots.
	 * An explicit `*` matches the remainder before this policy applies.
	 *
	 * @default 'bottom'
	 */
	unspecified?: UnspecifiedOrder | UnspecifiedOrderOptions;

	/**
	 * Orders matched members with equal inner rank, keeping unspecified units outside the callback.
	 */
	sort?: OrderSort;

	/**
	 * Formats each consecutive run of category members in the root and nested orders.
	 * Explicit group policies take precedence at the boundaries they format.
	 */
	blankLines?: BlankLines;
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
 * Configures a category with a priority sequence or expanded settings.
 */
export type CategoryOrder<Matcher extends CategoryMatcher = CategoryMatcher> =
	CategorySequence<Matcher> | CategoryOrderOptions<Matcher>;

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
	 * Applies inside selectors and semantic families, and at stylesheet level unless `root.order` overrides it.
	 * Inapplicable categories are skipped; peer families retain first-appearance order.
	 * Pseudo-element variants stay in their pseudo-element family, including `&:hover::before`.
	 */
	order?: OrderSequence;

	/**
	 * Placement of units not matched by `order` inside selectors and semantic families.
	 *
	 * @default 'bottom'
	 */
	unspecified?: UnspecifiedOrder | UnspecifiedOrderOptions;

	/**
	 * Structural ordering at stylesheet level, outside selector bodies.
	 * Category overrides and named groups are shared with the main order.
	 */
	root?: {
		/**
		 * Positions whole selector families and at-rule wrappers.
		 *
		 * @default The configured `order`, or the built-in stylesheet order if both are omitted.
		 */
		order?: OrderSequence;

		/**
		 * Placement of units not matched by `root.order` at stylesheet level.
		 *
		 * @default 'bottom'
		 */
		unspecified?: UnspecifiedOrder | UnspecifiedOrderOptions;
	};

	/**
	 * Configures category ordering and spacing without changing position or membership.
	 * At-rules use explicit matcher objects; other categories also accept literal strings and patterns.
	 * Omitted categories use their built-in defaults.
	 */
	categories?: {
		readonly [Category in OrderCategory]?: CategoryOrder<
			Category extends 'at-rules' ? AtRuleCategoryMatcher
				: Category extends 'css:media' | 'css:container' ? QueryCategoryMatcher : CategoryMatcher
		>;
	};

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
	 * BEM separators used to identify selector families and contextual conditions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;
};
