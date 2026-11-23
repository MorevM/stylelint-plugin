import { isArray, isFunction, isRegExp, isString, isUndefined, tsObject } from '@morev/utils';
import selectorParser from 'postcss-selector-parser';
import { DEFAULT_CATEGORY_ORDERS, DEFAULT_ORDER, DEFAULT_ROOT_ORDER, REMAINDER } from '../../order.constants';
import { createOrderSorter } from '../create-order-sorter/create-order-sorter';
import { getOrderHeader, getOrderSelectorText } from '../get-order-header/get-order-header';
import { matchesSelectorSet } from '../matches-selector-set/matches-selector-set';
import { normalizeParameters } from '../normalize-parameters/normalize-parameters';
import { normalizeProperty } from '../normalize-property/normalize-property';
import type { Family, OrderItem, OrderLabel, OrderRank, PreparedOrderSorter, PreparedOrderSpacing } from '../../order.internal-types';
import type {
	AtRuleMatcher, CategoryMatcher, CategoryOrder, CategoryOrderOptions, CategorySequence,
	OrderCategory, OrderGroupSpacing, OrderMatcher, OrderSequence, PropertiesGroup, RuleMatcher,
	SecondaryOption, UnspecifiedOrder, UnspecifiedOrderOptions,
} from '../../order.types';

/**
 * Expanded matcher with its own or its enclosing group's sorting policy.
 */
type ExpandedMatcher = {
	/**
	 * Original matcher used for category assignment or authored-node matching.
	 */
	matcher: OrderMatcher;

	/**
	 * Named group provenance, preserved even when equal-rank entries are flattened.
	 */
	group?: string;

	/**
	 * Prepared matcher or group sorter.
	 */
	sort?: PreparedOrderSorter;

	/**
	 * Stable configuration path, including anonymous groups.
	 */
	scope: string;

	/**
	 * Formatting retained when a named fragment expands to several ranks.
	 */
	spacing: PreparedOrderSpacing;
};

/**
 * Matches optional authored text without carrying regular-expression state between calls.
 *
 * @param   pattern   Exact text or regular expression; an omitted pattern accepts any value.
 * @param   value     Authored or normalized text, when available.
 *
 * @returns           Whether the value satisfies the optional constraint.
 */
const matchesValue = (pattern: string | RegExp | undefined, value: string | undefined) => {
	if (isUndefined(pattern)) return true;
	if (isUndefined(value)) return false;
	if (isString(pattern)) return pattern === value;

	// A shared /g or /y matcher must not carry state between nodes or lint runs.
	return new RegExp(pattern.source, pattern.flags).test(value);
};

/**
 * Chooses the most specific label and retains its precedence for nested families.
 *
 * @param   matcher    Label of the matched selector, at-rule or property matcher.
 * @param   group      Label shared by members of a named or unmatched group.
 * @param   category   Label shared by members of a built-in category.
 *
 * @returns            The label to use when rendering a diagnostic.
 */
const resolveLabel = (matcher?: string, group?: string, category?: string): OrderLabel | undefined => {
	if (!isUndefined(matcher)) return { text: matcher, priority: 3 };
	if (!isUndefined(group)) return { text: group, priority: 2 };
	if (!isUndefined(category)) return { text: category, priority: 1 };
	return undefined;
};

/**
 * Matches property names against normalized names or regular expressions.
 *
 * @param   matcher    Property constraint from the configured order.
 * @param   property   Authored declaration name.
 *
 * @returns            Whether the authored or normalized property satisfies the constraint.
 */
const matchesProperty = (matcher: string | RegExp, property: string) => {
	if (isString(matcher)) return normalizeProperty(matcher) === normalizeProperty(property);
	return matchesValue(matcher, property) || matchesValue(matcher, normalizeProperty(property));
};

/**
 * Gives explicit matches precedence over the remainder at any position in the sequence.
 *
 * @param   sequence   Priority slots in configured order.
 * @param   isMatch    Whether an explicit slot matches the current item.
 *
 * @returns            First matching rank, the remainder rank, or -1 if neither exists.
 */
const findOrderRank = <T>(sequence: readonly T[], isMatch: (entry: T) => boolean) => {
	let remainder = -1;
	for (const [index, entry] of sequence.entries()) {
		if (entry === '*') remainder = index;
		else if (isMatch(entry)) return index;
	}
	return remainder;
};

/**
 * Locates an ordinary declaration within an explicit property group.
 *
 * @param   group   Ordered property matchers, including equal-rank entries.
 * @param   item    Authored unit to classify.
 *
 * @returns         First matching group index, or -1 for unmatched nodes and variables.
 */
const getPropertyRank = (group: PropertiesGroup, item: OrderItem) => {
	const { node } = item;
	if (node.type !== 'decl' || /^(?:--|\$)/u.test(node.prop)) return -1;

	return findOrderRank(group.properties, (entry) => (isArray(entry) ? entry : [entry])
		.some((matcher) => matchesProperty(matcher, node.prop)));
};

/**
 * Applies a structured matcher to an authored node and its resolved selector metadata.
 *
 * @param   matcher   Rule, at-rule or property-group constraint.
 * @param   item      Authored unit to match.
 *
 * @returns           Whether every supplied constraint is satisfied.
 */
const matchesObject = (matcher: AtRuleMatcher | RuleMatcher | PropertiesGroup, item: OrderItem) => {
	if ('properties' in matcher) return getPropertyRank(matcher, item) !== -1;

	const { node } = item;
	if (matcher.type === 'rule') {
		const selector = getOrderSelectorText(item);
		return !isUndefined(selector)
			&& matchesValue(matcher.selector, selector)
			&& matchesValue(matcher.relativeSelector, item.selector?.relativeSelector);
	}

	return node.type === 'atrule'
		&& (isUndefined(matcher.name) || matcher.name === node.name)
		&& (isUndefined(matcher.hasBlock) || matcher.hasBlock === Boolean(node.nodes))
		&& matchesValue(
			isString(matcher.parameter) ? normalizeParameters(matcher.parameter) : matcher.parameter,
			normalizeParameters(node.params),
		);
};

/**
 * Translates the unmatched-item policy into a sortable rank or an ignored slot.
 *
 * @param   policy   Placement policy for unmatched units.
 * @param   length   Number of explicit priority slots.
 *
 * @returns          Rank before or after explicit entries, or null when ordering is ignored.
 */
const getUnspecifiedRank = (policy: UnspecifiedOrder, length: number) => {
	if (policy === 'ignore') return null;
	return policy === 'top' ? -1 : length;
};

/**
 * Matches category-local priorities against authored units or semantic families.
 *
 * @param   matcher     Category-local matcher or equal-rank matcher list.
 * @param   item        Authored unit and its selector metadata.
 * @param   family      Semantic sibling family, when matching a grouped unit.
 * @param   matchText   Name or normalized query parameters used by the selected category.
 *
 * @returns             Whether the unit or family belongs to this priority slot.
 */
const isCategoryMatch = (
	matcher: CategorySequence[number], item: OrderItem, family?: Family, matchText = item.atRuleMember?.name,
): boolean => {
	if (isArray(matcher)) return matcher.some((entry) => isCategoryMatch(entry, item, family, matchText));
	if (!isString(matcher) && 'properties' in matcher) return getPropertyRank(matcher, item) !== -1;
	if (!isString(matcher) && 'selectorSet' in matcher) {
		return !family && Boolean(item.selector && matchesSelectorSet(matcher.selectorSet, item.selector.localSelectors));
	}

	if (!isUndefined(matchText) && (isString(matcher) || isRegExp(matcher))) {
		return matchesValue(matcher, matchText);
	}

	if (isRegExp(matcher)) {
		if (item.node.type === 'decl') return matchesProperty(matcher, item.node.prop);
		const selector = getOrderSelectorText(item);
		if (!isUndefined(selector)) {
			return matchesValue(matcher, selectorParser().processSync(selector, { lossless: false }));
		}
		return item.node.type !== 'atrule' && matchesValue(matcher, getOrderHeader(item.node));
	}

	if (!isString(matcher)) return 'type' in matcher && matchesObject(matcher, item);
	if (!family && item.selector?.isList) return false;
	if (family?.key === matcher || item.selector?.tokens.includes(matcher)) return true;

	const { node } = item;

	return node.type === 'decl' && matchesProperty(matcher, node.prop);
};

/**
 * Prepares spacing metadata with a stable group identity.
 *
 * @param   settings     Spacing policy from a group or category override.
 * @param   key          Scope identity used to recognize adjacent members of the same group.
 * @param   groupLabel   Display label inherited from the enclosing named group.
 *
 * @returns              Spacing policy with its scope identity.
 */
const spacing = (settings: OrderGroupSpacing | undefined, key: string, groupLabel?: string): PreparedOrderSpacing => ({
	key, blankLines: settings?.blankLines, label: settings?.label ?? groupLabel,
});

/**
 * Gives unmatched siblings the same group identity for all placement shorthands.
 *
 * @param   key       Configuration scope that owns the group.
 * @param   setting   Placement and optional formatting of the unmatched group.
 *
 * @returns           Resolved placement and spacing for this scope.
 */
const prepareUnspecified = (key: string, setting: UnspecifiedOrder | UnspecifiedOrderOptions = 'bottom') => ({
	position: isString(setting) ? setting : setting.position,
	spacing: spacing(isString(setting) ? undefined : setting, key),
});

const isQueryCategory = (category: OrderCategory) => category === 'css:media' || category === 'css:container';

/**
 * Resolves shared settings for qualifier types, Sass include forms and specific at-rules.
 *
 * @param   category   Category selected by the outer order.
 * @param   item       Authored item with its specific at-rule category, if any.
 * @param   settings   Categories with an override for the policy being resolved.
 *
 * @returns            Category supplying the applicable override.
 */
const getConfiguredCategory = (
	category: OrderCategory, item: OrderItem, settings: ReadonlyMap<OrderCategory, unknown>,
) => {
	if (settings.has(category)) return category;
	if (category.startsWith('qualifiers:') && settings.has('qualifiers')) return 'qualifiers';
	if (!item.atRuleMember || category === 'at-rules') return category;
	if (settings.has(item.atRuleMember.category)) return item.atRuleMember.category;
	return settings.has('at-rules') ? 'at-rules' : category;
};

/**
 * Resolves a category override using defaults compatible with its matcher contract.
 *
 * @param   override    Optional sequence, transformer or expanded category settings.
 * @param   defaults    Built-in matchers accepted by the same category.
 * @param   category    Category that owns the local groups.
 * @param   normalize   Optional normalization for exact string matchers in the configured order.
 *
 * @returns             Prepared matchers and policies, or undefined for omitted categories.
 */
const prepareCategoryOrder = <Matcher extends CategoryMatcher>(
	override: CategoryOrder<Matcher> | undefined,
	defaults: CategorySequence<Matcher>,
	category: OrderCategory,
	normalize?: (value: string) => string,
) => {
	if (isUndefined(override)) return undefined;

	const settings: CategoryOrderOptions<Matcher> = isArray(override) || isFunction(override)
		? { order: override }
		: override as CategoryOrderOptions<Matcher>;
	const sequence = settings.order ?? defaults;
	const order = isFunction(sequence) ? sequence(defaults) : sequence;

	const normalizeMatcher = <T>(matcher: T) => (normalize && isString(matcher) ? normalize(matcher) : matcher);
	return {
		order: normalize && order !== defaults
			? order.map((entry) => {
				if (isArray<Matcher>(entry)) return entry.map((matcher) => normalizeMatcher(matcher));
				return normalizeMatcher(entry);
			})
			: order,
		unspecified: prepareUnspecified(`categories.${category}.unspecified`, settings.unspecified),
		sort: isUndefined(settings.sort) ? undefined : createOrderSorter(settings.sort),
	};
};

/**
 * Expands named fragments and prepares category orders once per stylesheet.
 *
 * @param        options   Validated rule options.
 *
 * @returns                Rank lookup shared by all authored and semantic containers.
 *
 * @throws  {Error}    If a property group is configured outside the declaration category.
 */
const createOrderConfig = (options: SecondaryOption) => {
	const sorters = new WeakMap<AtRuleMatcher | RuleMatcher | PropertiesGroup, PreparedOrderSorter>();

	/**
	 * Prepares each matcher's sorter once per configuration.
	 *
	 * @param   matcher   Matcher that may supply a sorting policy.
	 *
	 * @returns           Shared prepared sorter, or undefined when the matcher has no sorter.
	 */
	const matcherSorter = (matcher: AtRuleMatcher | RuleMatcher | PropertiesGroup) => {
		if (isUndefined(matcher.sort)) return undefined;
		if (!sorters.has(matcher)) sorters.set(matcher, createOrderSorter(matcher.sort));
		return sorters.get(matcher);
	};

	/**
	 * Expands a matcher or named group into priority slots with sorting and spacing metadata.
	 *
	 * @param   matcher   Category, structured matcher or named group reference.
	 * @param   scope     Configuration path of the authored matcher.
	 *
	 * @returns           Expanded slots whose members share a rank.
	 */
	const expand = (matcher: OrderMatcher, scope: string): ExpandedMatcher[][] => {
		if (!isString(matcher) || !matcher.startsWith('group:')) {
			const property = !isString(matcher) && 'properties' in matcher ? matcher : undefined;

			return [[{
				matcher, scope,
				sort: isString(matcher) ? undefined : matcherSorter(matcher),
				spacing: spacing(property, scope),
			}]];
		}

		const group = matcher.slice('group:'.length);
		const definition = options.groups![group];
		if ('properties' in definition) {
			return [[{
				matcher: definition, group, scope: `groups.${group}`,
				sort: matcherSorter(definition), spacing: spacing(definition, `groups.${group}`),
			}]];
		}

		const settings = 'order' in definition ? definition : { order: definition };
		const sort = isUndefined(settings.sort) ? undefined : createOrderSorter(settings.sort);

		return settings.order.map((entry, index) => (isArray(entry) ? [...entry] : [entry]).map((member, memberIndex) => {
			const memberScope = `groups.${group}.order.${index}.${memberIndex}`;
			const property = !isString(member) && 'properties' in member ? member : undefined;
			const memberSort = isString(member) ? undefined : matcherSorter(member);

			return {
				matcher: member, group,
				scope: property || memberSort ? memberScope : `groups.${group}`,
				sort: memberSort ?? sort,
				spacing: property ? spacing(property, memberScope, settings.label) : spacing(settings, `groups.${group}`),
			};
		}));
	};

	/**
	 * Expands an order while preserving equal-rank entries and configuration paths.
	 *
	 * @param   sequence   Root or nested order supplied by configuration or defaults.
	 * @param   scope      Configuration path identifying this order.
	 *
	 * @returns            Prepared priority slots for subsequent rank lookup.
	 */
	const expandOrder = (sequence: OrderSequence, scope: string) => {
		const slots = sequence.flatMap((entry, index) => isArray(entry)
			? [entry.flatMap((matcher, member) => expand(matcher, `${scope}.${index}.${member}`).flat())]
			: expand(entry as OrderMatcher, `${scope}.${index}`));
		const matchers = new Set(slots.flatMap((entries) => entries.map(({ matcher }) => matcher)));
		return { slots, matchers };
	};

	const nestedOrder = expandOrder(options.order ?? DEFAULT_ORDER, 'order');
	const rootOrder = expandOrder(options.root?.order ?? DEFAULT_ROOT_ORDER, 'root.order');
	const nestedUnspecified = prepareUnspecified('unspecified', options.unspecified);
	const rootUnspecified = prepareUnspecified('root.unspecified', options.root?.unspecified);

	const categoryOrders = new Map<OrderCategory, NonNullable<ReturnType<typeof prepareCategoryOrder>>>();
	const categorySpacing = new Map<OrderCategory, PreparedOrderSpacing>();
	const categoryLabels = new Map<OrderCategory, string>();
	const overrides = options.categories ?? {};
	for (const category of tsObject.keys(overrides)) {
		const override = overrides[category];
		if (override && ('blankLines' in override || 'label' in override)) {
			if (!isUndefined(override.label)) categoryLabels.set(category, override.label);
			if (override.blankLines) categorySpacing.set(category, spacing(override, `categories.${category}`));
			// Formatting and labels leave an inherited category order in effect.
			if (isUndefined(override.order) && isUndefined(override.sort) && isUndefined(override.unspecified)) continue;
		}

		const prepared = category === 'at-rules'
			? prepareCategoryOrder(overrides[category], REMAINDER, category)
			: isQueryCategory(category)
				? prepareCategoryOrder(overrides[category], REMAINDER, category, normalizeParameters)
				: prepareCategoryOrder(overrides[category], DEFAULT_CATEGORY_ORDERS[category] ?? REMAINDER, category);
		if (isUndefined(prepared)) continue;

		if (category !== 'declarations' && prepared.order.flat().some((entry) => !isString(entry) && 'properties' in entry)) {
			throw new Error('Property groups are only supported within declarations');
		}

		categoryOrders.set(category, prepared);
	}

	/**
	 * Resolves outer, category-local and property-member priorities for one sorting unit.
	 *
	 * @param   item              Representative authored node and selector metadata.
	 * @param   family            Semantic family represented by this unit, when present.
	 * @param   canMatchObjects   Whether structured authored-node matchers may select the unit.
	 * @param   isRoot            Whether to consult the document order instead of the nested order.
	 *
	 * @returns                   Effective priorities with applicable sorting, spacing and diagnostic metadata.
	 */
	const getRank = (item: OrderItem, family?: Family, canMatchObjects = true, isRoot = false): OrderRank => {
		const { slots: order, matchers } = isRoot ? rootOrder : nestedOrder;
		const { node } = item;
		const categories: OrderCategory[] = (() => {
			if (family) return [family.category, 'rules'];
			if (node.type === 'rule') return [...(item.selector?.categories ?? []), 'rules'];
			if (node.type === 'atrule') return ['at-rules'];
			if (node.type !== 'decl') return [];
			if (node.prop.startsWith('$')) return ['sass:variables'];
			if (node.prop.startsWith('--')) return ['custom-properties'];
			return ['declarations'];
		})();

		let selected: ExpandedMatcher | undefined;
		let rank = canMatchObjects
			? order.findIndex((entries) => {
				selected = entries.find(({ matcher }) => !isString(matcher) && matchesObject(matcher, item));
				return Boolean(selected);
			})
			: -1;
		const selector = family ? undefined : item.selector;
		const isPlaceholder = categories[0] === 'sass:placeholders';
		let specificCategories = item.atRuleMember
			? [item.atRuleMember.category]
			: selector && (node.type === 'atrule' || selector.isList || isPlaceholder) ? selector.categories : undefined;
		if (selector?.categories.includes('qualifiers') && matchers.has('qualifiers')) {
			const hasNarrowQualifier = selector.categories.some((candidate) => {
				return candidate.startsWith('qualifiers:') && matchers.has(candidate);
			});
			specificCategories = hasNarrowQualifier
				? selector.categories.filter((candidate) => candidate !== 'qualifiers')
				: selector.categories;
		}
		let category: OrderCategory = selector?.isList && !isPlaceholder ? 'rules' : categories[0];
		if (rank === -1 || specificCategories) {
			// Check an explicitly configured semantic category before its generic fallback.
			const categoryGroups: OrderCategory[][] = specificCategories
				? [specificCategories, [node.type === 'atrule' ? 'at-rules' : 'rules']]
				: [categories];
			if (item.atRuleMember?.category === 'sass:includes' && node.type === 'atrule') {
				categoryGroups.unshift([node.nodes ? 'sass:include-blocks' : 'sass:include-statements']);
			}
			for (const eligible of categoryGroups) {
				let categoryMatch: ExpandedMatcher | undefined;
				const categoryRank = order.findIndex((entries) => {
					categoryMatch = entries.find(({ matcher }) => {
						return isString(matcher) && eligible.includes(matcher as OrderCategory);
					});
					return Boolean(categoryMatch);
				});
				if (categoryRank === -1) continue;

				category = categoryMatch!.matcher as OrderCategory;
				if (rank === -1) {
					rank = categoryRank;
					selected = categoryMatch;
				}
				break;
			}
		}

		if (rank === -1) {
			rank = order.findIndex((entries) => {
				selected = entries.find(({ matcher }) => matcher === '*');
				return Boolean(selected);
			});
		}

		const categoryLabel = categoryLabels.size
			? categoryLabels.get(getConfiguredCategory(category, item, categoryLabels))
			: undefined;
		if (isUndefined(selected)) {
			const unspecified = isRoot ? rootUnspecified : nestedUnspecified;

			return {
				outer: getUnspecifiedRank(unspecified.position, order.length), inner: 0, member: 0, category,
				spacing: unspecified.spacing, label: resolveLabel(undefined, unspecified.spacing.label, categoryLabel),
			};
		}

		const outerSpacing = selected.spacing;
		const categoryPolicy = categorySpacing.size
			? categorySpacing.get(getConfiguredCategory(category, item, categorySpacing))
			: undefined;
		if (!isString(selected.matcher)) {
			const property = 'properties' in selected.matcher ? selected.matcher : undefined;
			return {
				outer: rank, inner: property ? getPropertyRank(property, item) : 0, member: 0, category,
				innerScope: property ? selected.scope : undefined,
				sort: selected.sort, sortScope: selected.sort ? `${selected.scope}.sort` : undefined, group: selected.group,
				label: resolveLabel(selected.matcher.label, outerSpacing.label, categoryLabel),
				spacing: outerSpacing, categorySpacing: categoryPolicy,
			};
		}

		category = getConfiguredCategory(category, item, categoryOrders);
		const settings = categoryOrders.get(category);
		const categoryOrder = settings?.order ?? DEFAULT_CATEGORY_ORDERS[category] ?? REMAINDER;
		// Explicit category priorities apply only within the slots left to that category.
		const innerScope = categoryOrder.length === 1 && categoryOrder[0] === '*' ? undefined : category;
		const matchText = isQueryCategory(category) && node.type === 'atrule' && categoryOrder !== REMAINDER
			? normalizeParameters(node.params)
			: item.atRuleMember?.name;
		const inner = findOrderRank(categoryOrder, (matcher) => isCategoryMatch(matcher, item, family, matchText));
		const slot = categoryOrder[inner];
		const matchIndex = isArray(slot) ? slot.findIndex((entry) => isCategoryMatch(entry, item, family, matchText)) : 0;
		const match = isArray(slot) ? slot[matchIndex] : slot;

		const innerLabel = match && !isString(match) && !isRegExp(match) ? match.label : undefined;
		const property = match && !isString(match) && 'properties' in match ? match : undefined;
		const scope = `categories.${category}.order.${inner}.${matchIndex}`;
		if (property) {
			return {
				outer: rank, inner, innerScope, member: getPropertyRank(property, item), category,
				memberScope: scope,
				label: resolveLabel(property.label, outerSpacing.label, categoryLabel),
				sort: matcherSorter(property), sortScope: `${scope}.sort`,
				spacing: spacing(property, scope), categorySpacing: categoryPolicy,
			};
		}

		const innerSort = match && !isString(match) && 'type' in match ? matcherSorter(match) : undefined;
		const sort = inner === -1 ? undefined : innerSort ?? selected.sort ?? settings?.sort;
		const sortScope = innerSort ? scope : selected.sort ? selected.scope : `categories.${category}`;
		const unmatchedSpacing = inner === -1 ? settings?.unspecified.spacing : undefined;
		// A named group keeps its spacing for unmatched members unless the local remainder has its own policy.
		const useUnmatchedSpacing = !isUndefined(unmatchedSpacing)
			&& (isUndefined(selected.group) || !isUndefined(unmatchedSpacing.blankLines));

		return {
			outer: rank, innerScope,
			inner: inner === -1 ? getUnspecifiedRank(settings?.unspecified.position ?? 'bottom', categoryOrder.length) : inner,
			member: 0, memberScope: innerSort ? selected.group : undefined, category,
			sort,
			sortScope: sort ? `${sortScope}.sort` : undefined,
			group: selected.group,
			label: resolveLabel(innerLabel, outerSpacing.label ?? unmatchedSpacing?.label, categoryLabel),
			spacing: useUnmatchedSpacing ? unmatchedSpacing : outerSpacing,
			categorySpacing: categoryPolicy,
		};
	};

	/**
	 * Resolves category-local priorities with overrides before built-in defaults.
	 *
	 * @param   category   Category whose priority sequence is requested.
	 *
	 * @returns            Configured sequence, built-in defaults, or the remainder matcher.
	 */
	const getCategoryOrder = (category: OrderCategory) => {
		return categoryOrders.get(category)?.order ?? DEFAULT_CATEGORY_ORDERS[category] ?? REMAINDER;
	};

	return { getRank, getCategoryOrder };
};

export { createOrderConfig, findOrderRank, isCategoryMatch };
