import { isArray, isEmpty, isRegExp, isString, isUndefined, tsObject } from '@morev/utils';
import selectorParser from 'postcss-selector-parser';
import { DEFAULT_CATEGORY_ORDERS, DEFAULT_ORDER, DEFAULT_ROOT_ORDER, REMAINDER } from '../../order.constants';
import { createOrderSorter } from '../create-order-sorter/create-order-sorter';
import { getOrderHeader, getOrderSelectorText } from '../get-order-header/get-order-header';
import { hasRequiredBranches, matchesSelectorSet, prepareSelectorSet } from '../matches-selector-set/matches-selector-set';
import { normalizeParameters } from '../normalize-parameters/normalize-parameters';
import { normalizeProperty } from '../normalize-property/normalize-property';
import type { Family, OrderItem, OrderLabel, OrderRank, PreparedOrderSorter, PreparedOrderSpacing, SelectorOrder } from '../../order.internal-types';
import type {
	AtRuleMatcher, CategoryMatcher, CategoryOrder, CategoryOrderOptions, CategorySequence,
	OrderCategory, OrderGroupSpacing, OrderMatcher, OrderSequence, PropertiesGroup, RuleMatcher,
	SecondaryOption, UnspecifiedOrder, UnspecifiedOrderOptions,
} from '../../order.types';

/**
 * Outer rule matchers reuse their normalized selector sets across siblings.
 */
type PreparedNodeMatcher = AtRuleMatcher | (Omit<RuleMatcher, 'selectorSet'> & {
	/**
	 * Required local branches and their inclusive count bounds.
	 */
	selectorSet?: ReturnType<typeof prepareSelectorSet>;
});

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

const VARIABLE_PREFIX = /^(?:--|\$)/u;
const PSEUDO_ELEMENT_STATES = 'pseudo-classes:pseudo-element';

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
 * Counts local BEM branches, or distinct authored branches when only the size is constrained.
 *
 * @param   matcher   Authored or prepared selector-set constraint.
 * @param   item      Authored ordering unit.
 *
 * @returns           Whether the rule satisfies the selector set.
 */
const matchesItemSelectorSet = (matcher: Parameters<typeof matchesSelectorSet>[0], item: OrderItem) => {
	if (item.selector?.localSelectors.length) return matchesSelectorSet(matcher, item.selector.localSelectors);
	if (item.node.type !== 'rule') return false;

	const required = 'branches' in matcher ? matcher : prepareSelectorSet(matcher);
	if (!isEmpty(required.branches)) return false;
	if (isUndefined(item.selectorCount)) {
		try {
			const list = selectorParser().astSync(item.node.selector, { lossless: false });
			list.walkComments((comment) => { comment.remove(); });
			item.selectorCount = new Set(list.nodes.map((branch) => branch.toString())).size;
		} catch {
			item.selectorCount = 0;
		}
	}
	return hasRequiredBranches(required, [], item.selectorCount);
};

/**
 * Applies a structured matcher to an authored node and its resolved selector metadata.
 *
 * @param   matcher   Rule or at-rule constraint.
 * @param   item      Authored unit to match.
 * @param   family    Semantic family when the item represents a whole family.
 *
 * @returns           Whether every supplied constraint is satisfied.
 */
const matchesObject = (matcher: PreparedNodeMatcher | RuleMatcher, item: OrderItem, family?: Family) => {
	const { node } = item;
	if (matcher.type === 'rule') {
		const selector = getOrderSelectorText(item);
		return !isUndefined(selector)
			&& matchesValue(matcher.selector, selector)
			&& matchesValue(matcher.relativeSelector, item.selector?.relativeSelector)
			&& (!matcher.selectorSet || (!family && matchesItemSelectorSet(matcher.selectorSet, item)));
	}

	return node.type === 'atrule'
		&& (isUndefined(matcher.name) || matcher.name === node.name)
		&& (isUndefined(matcher.hasBlock) || matcher.hasBlock === Boolean(node.nodes))
		&& (isUndefined(matcher.parameter) || matchesValue(
			isString(matcher.parameter) ? normalizeParameters(matcher.parameter) : matcher.parameter,
			normalizeParameters(node.params),
		));
};

/**
 * Compares text constraints that already match the same value.
 * Distinct regular expressions have no defined priority relative to each other.
 *
 * @param   broad    Constraint that may cover the other.
 * @param   narrow   Constraint on the same field of the other matcher.
 *
 * @returns          Whether the second constraint is at least as specific as the first.
 */
const coversPattern = (broad?: string | RegExp, narrow?: string | RegExp) => {
	if (isUndefined(broad) || isString(narrow)) return true;
	return isRegExp(broad) && isRegExp(narrow) && broad.source === narrow.source && broad.flags === narrow.flags;
};

/**
 * Checks whether a matching object preserves every constraint of another matching object.
 * Authored and relative selectors constrain different fields, even when their text coincides.
 *
 * @param   broad    Object whose constraints must be preserved.
 * @param   narrow   Object that may add or tighten constraints.
 *
 * @returns          Whether the second object is equally specific or a refinement of the first.
 */
const coversMatcher = (broad: PreparedNodeMatcher, narrow: PreparedNodeMatcher) => {
	if (broad.type === 'rule' && narrow.type === 'rule') {
		if (broad.selectorSet) {
			const set = narrow.selectorSet;
			if (!set || !hasRequiredBranches(broad.selectorSet, set.branches, set.minSize, set.maxSize)) return false;
		}
		return coversPattern(broad.selector, narrow.selector)
			&& coversPattern(broad.relativeSelector, narrow.relativeSelector);
	}
	if (broad.type !== 'at-rule' || narrow.type !== 'at-rule') return false;

	return (isUndefined(broad.name) || broad.name === narrow.name)
		&& (isUndefined(broad.hasBlock) || broad.hasBlock === narrow.hasBlock)
		&& coversPattern(broad.parameter, narrow.parameter);
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
 * @param   category    Category whose local conditions are being matched.
 * @param   family      Semantic sibling family, when matching a grouped unit.
 * @param   matchText   Name or normalized query parameters used by the selected category.
 *
 * @returns             Whether the unit or family belongs to this priority slot.
 */
const isCategoryMatch = (
	matcher: CategorySequence[number], item: OrderItem, category?: OrderCategory,
	family?: Family, matchText = item.atRuleMember?.name,
): boolean => {
	if (isArray(matcher)) return matcher.some((entry) => isCategoryMatch(entry, item, category, family, matchText));
	if (!isString(matcher) && !isRegExp(matcher)) {
		if ('type' in matcher) return matchesObject(matcher, item, family);
		if ('properties' in matcher) {
			const { node } = item;
			return node.type === 'decl' && !VARIABLE_PREFIX.test(node.prop) && matcher.properties.some((slot) => {
				return slot === '*' || [slot].flat().some((pattern) => matchesProperty(pattern, node.prop));
			});
		}
		return 'selectorSet' in matcher && !family && matchesItemSelectorSet(matcher.selectorSet, item);
	}

	if (!isUndefined(matchText)) return matchesValue(matcher, matchText);

	if (isRegExp(matcher)) {
		if (item.node.type === 'decl') return matchesProperty(matcher, item.node.prop);
		const selector = getOrderSelectorText(item);
		if (!isUndefined(selector)) {
			return matchesValue(matcher, selectorParser().processSync(selector, { lossless: false }));
		}
		return item.node.type !== 'atrule' && matchesValue(matcher, getOrderHeader(item.node));
	}

	if (!family && item.selector?.isList) return false;
	const tokens = category === PSEUDO_ELEMENT_STATES ? item.selector?.pseudoElementStates : item.selector?.tokens;
	if (family?.key === matcher || tokens?.includes(matcher)) return true;

	const { node } = item;

	return node.type === 'decl' && matchesProperty(matcher, node.prop);
};

/**
 * Matches declaration names in precedence order. Each literal only competes with earlier regular expressions.
 *
 * @param   entries   Property patterns and their results, with each fallback placed after its explicit matches.
 *
 * @returns           The first match for an authored property name.
 */
const indexPropertyPatterns = <T>(entries: Array<{ pattern: string | RegExp; value: T }>) => {
	const literals = new Map<string, { value: T; priorPatterns: number }>();
	const patterns: Array<{ pattern: RegExp; value: T }> = [];
	let remainder: T | undefined;
	for (const { pattern, value } of entries) {
		if (pattern === '*') {
			remainder = value;
			break;
		}
		if (isRegExp(pattern)) {
			patterns.push({ pattern, value });
		} else {
			const name = normalizeProperty(pattern);
			if (!literals.has(name)) literals.set(name, { value, priorPatterns: patterns.length });
		}
	}

	return (name: string) => {
		const literal = literals.get(normalizeProperty(name));
		const limit = literal?.priorPatterns ?? patterns.length;
		for (let index = 0; index < limit; index++) {
			const { pattern, value } = patterns[index];
			if (matchesProperty(pattern, name)) return value;
		}
		return literal?.value ?? remainder;
	};
};

/**
 * Visits explicit matchers before the remainder, retaining each member's authored rank.
 *
 * @param    order   Category or property-group sequence.
 *
 * @yields          Matcher with its slot and equal-rank member index.
 */
function* declarationSlots<T extends CategoryMatcher>(order: CategorySequence<T>) {
	let remainder = -1;
	for (const [rank, slot] of order.entries()) {
		if (slot === '*') {
			remainder = rank;
			continue;
		}
		const members = isArray<T>(slot) ? slot : [slot as T];
		for (const [member, matcher] of members.entries()) yield { rank, member, matcher };
	}
	if (remainder !== -1) yield { rank: remainder, member: 0, matcher: '*' as const };
}

/**
 * Indexes category priorities and the ranks within their property groups in a single lookup.
 *
 * @param   order   Declaration priorities, including equal-rank slots and property groups.
 *
 * @returns         The matching category slot, member and property rank.
 */
const prepareDeclarationOrder = (order: CategorySequence) => {
	const entries = [];
	for (const { rank, member, matcher } of declarationSlots(order)) {
		if (isString(matcher) || isRegExp(matcher)) {
			entries.push({ pattern: matcher, value: { rank, member, propertyRank: 0 } });
		} else if ('properties' in matcher) {
			for (const { rank: propertyRank, matcher: pattern } of declarationSlots(matcher.properties)) {
				entries.push({ pattern, value: { rank, member, propertyRank } });
			}
		}
	}
	const lookup = indexPropertyPatterns(entries);
	return (name: string) => lookup(name) ?? { rank: -1, member: 0, propertyRank: -1 };
};

/**
 * Prepares spacing metadata with a stable group identity.
 *
 * @param   settings     Spacing policy from a matcher, group or category.
 * @param   key          Scope identity used to recognize adjacent members of the same group.
 * @param   groupLabel   Display label inherited from the enclosing named group.
 *
 * @returns              Spacing policy with its scope identity.
 */
const spacing = (settings: OrderGroupSpacing | undefined, key: string, groupLabel?: string): PreparedOrderSpacing => ({
	key, blankLines: settings?.blankLines, label: settings?.label ?? groupLabel,
});

/**
 * Keeps the enclosing group's full run available for gaps the matcher leaves unspecified.
 *
 * @param   matcher   Matcher selected at this position.
 * @param   key       Configuration path identifying consecutive matches.
 * @param   outer     Spacing inherited at this position.
 * @param   group     Enclosing named group, if present.
 *
 * @returns           Spacing for the selected matcher and its enclosing run.
 */
const matcherSpacing = (
	matcher: OrderGroupSpacing | undefined, key: string, outer: PreparedOrderSpacing, group?: string,
) => {
	if (!matcher?.blankLines) return outer;
	const member = spacing(matcher, key, outer.label);
	return group ? { ...outer, member } : member;
};

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
 * Prepares the order and sorting policies for a configured category.
 *
 * @param   override   Priority sequence or expanded category settings.
 * @param   category   Category that owns the local groups.
 *
 * @returns            Prepared matchers and policies.
 */
const prepareCategoryOrder = (override: CategoryOrder, category: OrderCategory) => {
	const settings: CategoryOrderOptions = isArray(override)
		? { order: override }
		: override as CategoryOrderOptions;
	const { order } = settings;

	return {
		declarationOrder: category === 'declarations' && order ? prepareDeclarationOrder(order) : undefined,
		order: order && isQueryCategory(category)
			? order.map((entry) => {
				if (isArray<CategoryMatcher>(entry)) {
					return entry.map((matcher) => (isString(matcher) ? normalizeParameters(matcher) : matcher));
				}
				return isString(entry) ? normalizeParameters(entry) : entry;
			})
			: order ?? DEFAULT_CATEGORY_ORDERS[category] ?? REMAINDER,
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
	const propertyOrders = new Map<PropertiesGroup, ReturnType<typeof prepareDeclarationOrder>>();
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
			const object = isString(matcher) ? undefined : matcher;
			return [[{
				matcher, scope,
				sort: object && matcherSorter(object),
				spacing: spacing(object, scope),
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
		const groupSpacing = spacing(settings, `groups.${group}`);

		return settings.order.map((entry, index) => (isArray(entry) ? [...entry] : [entry]).map((member, memberIndex) => {
			const memberScope = `groups.${group}.order.${index}.${memberIndex}`;
			const object = isString(member) ? undefined : member;
			const property = object && 'properties' in object ? object : undefined;
			const memberSort = object && matcherSorter(object);

			return {
				matcher: member, group,
				scope: property || memberSort ? memberScope : `groups.${group}`,
				sort: memberSort ?? sort,
				spacing: property
					? spacing(property, memberScope, settings.label)
					: matcherSpacing(object, memberScope, groupSpacing, group),
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
		const ranked = slots.flatMap((entries, rank) => entries.map((entry) => ({ entry, rank })));
		const matchers = new Set(ranked.map(({ entry }) => entry.matcher));
		const nodeMatchers = ranked.flatMap(({ entry, rank }) => {
			const { matcher } = entry;
			if (isString(matcher) || !('type' in matcher)) return [];
			const prepared = matcher.type === 'rule'
				? { ...matcher, selectorSet: matcher.selectorSet && prepareSelectorSet(matcher.selectorSet) }
				: matcher;
			return [{ entry, rank, matcher: prepared }];
		});
		const propertyMatchers = ranked.flatMap(({ entry, rank }) => {
			const { matcher } = entry;
			if (isString(matcher) || !('properties' in matcher)) return [];
			if (!propertyOrders.has(matcher)) propertyOrders.set(matcher, prepareDeclarationOrder(matcher.properties));
			return matcher.properties.flat().map((pattern) => ({ pattern, value: { entry, rank } }));
		});
		// An outer literal selects its group ahead of any matching pattern in another group.
		const findProperty = propertyMatchers.length
			? indexPropertyPatterns([
				...propertyMatchers.filter(({ pattern }) => isString(pattern) && pattern !== '*'),
				...propertyMatchers.filter(({ pattern }) => isRegExp(pattern)),
				...propertyMatchers.filter(({ pattern }) => pattern === '*'),
			])
			: undefined;

		const findObject = (item: OrderItem, family?: Family) => {
			const { node } = item;
			if (node.type === 'decl') {
				if (!findProperty || VARIABLE_PREFIX.test(node.prop)) return undefined;
				return findProperty(node.prop);
			}

			if (!nodeMatchers.length) return undefined;
			const matches = nodeMatchers.filter(({ matcher }) => matchesObject(matcher, item, family));
			if (matches.length < 2) return matches[0];

			// Configuration order breaks ties among the matches that have no stricter refinement.
			return matches.find(({ matcher }) => !matches.some(({ matcher: other }) => {
				return coversMatcher(matcher, other) && !coversMatcher(other, matcher);
			}));
		};
		return { slots, matchers, findObject };
	};

	const nestedOrder = expandOrder(options.order ?? DEFAULT_ORDER, 'order');
	const rootOrder = options.order && !options.root?.order
		? nestedOrder
		: expandOrder(options.root?.order ?? DEFAULT_ROOT_ORDER, 'root.order');
	const nestedUnspecified = prepareUnspecified('unspecified', options.unspecified);
	const rootUnspecified = prepareUnspecified('root.unspecified', options.root?.unspecified);

	const getSelectorCategories = (selector: SelectorOrder, isRoot = false): OrderCategory[] => {
		const order = isRoot ? rootOrder : nestedOrder;
		if (!selector.pseudoElementStates || !order.matchers.has(PSEUDO_ELEMENT_STATES)) return selector.categories;
		return selector.categories.map((category) => (category === 'pseudo-classes' ? PSEUDO_ELEMENT_STATES : category));
	};

	const categoryOrders = new Map<OrderCategory, ReturnType<typeof prepareCategoryOrder>>();
	const categorySpacing = new Map<OrderCategory, PreparedOrderSpacing>();
	const categoryLabels = new Map<OrderCategory, string>();
	const overrides = options.categories ?? {};
	for (const category of tsObject.keys(overrides)) {
		const override = overrides[category];
		if (isUndefined(override)) continue;
		if ('blankLines' in override || 'label' in override) {
			if (!isUndefined(override.label)) categoryLabels.set(category, override.label);
			if (override.blankLines) categorySpacing.set(category, spacing(override, `categories.${category}`));
			// Formatting and labels leave an inherited category order in effect.
			if (isUndefined(override.order) && isUndefined(override.sort) && isUndefined(override.unspecified)) continue;
		}

		const prepared = prepareCategoryOrder(override, category);

		if (category !== 'declarations' && prepared.order.flat().some((entry) => !isString(entry) && 'properties' in entry)) {
			throw new Error('Property groups are only supported within declarations');
		}

		categoryOrders.set(category, prepared);
	}

	// The subtype keeps its own rank even when it inherits a policy from the parent category.
	const inheritPseudoClassPolicy = <T>(policies: Map<OrderCategory, T>) => {
		const shared = policies.get('pseudo-classes');
		if (!isUndefined(shared) && !policies.has(PSEUDO_ELEMENT_STATES)) {
			policies.set(PSEUDO_ELEMENT_STATES, shared);
		}
	};
	inheritPseudoClassPolicy(categoryOrders);
	inheritPseudoClassPolicy(categorySpacing);
	inheritPseudoClassPolicy(categoryLabels);

	const stateOverride = overrides[PSEUDO_ELEMENT_STATES];
	if (stateOverride && ('sort' in stateOverride || 'unspecified' in stateOverride) && isUndefined(stateOverride.order)) {
		const shared = categoryOrders.get('pseudo-classes');
		if (shared) categoryOrders.get(PSEUDO_ELEMENT_STATES)!.order = shared.order;
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
		const { slots: order, matchers, findObject } = isRoot ? rootOrder : nestedOrder;
		const { node } = item;
		const selector = family ? undefined : item.selector;
		const selectorCategories = selector && getSelectorCategories(selector, isRoot);
		const categories: OrderCategory[] = (() => {
			if (family) return [family.category, 'rules'];
			if (node.type === 'rule') return [...(selectorCategories ?? []), 'rules'];
			if (node.type === 'atrule') return ['at-rules'];
			if (node.type !== 'decl') return [];
			if (node.prop.startsWith('$')) return ['sass:variables'];
			if (node.prop.startsWith('--')) return ['custom-properties'];
			return ['declarations'];
		})();

		const object = canMatchObjects ? findObject(item, family) : undefined;
		let selected = object?.entry;
		let rank = object?.rank ?? -1;
		const isPlaceholder = categories[0] === 'sass:placeholders';
		const hasSpecificCategory = node.type === 'atrule' || isPlaceholder || Boolean(selector?.isList)
			|| Boolean(selectorCategories?.includes(PSEUDO_ELEMENT_STATES));
		let specificCategories = item.atRuleMember
			? [item.atRuleMember.category]
			: hasSpecificCategory ? selectorCategories : undefined;
		if (selectorCategories?.includes('qualifiers') && matchers.has('qualifiers')) {
			const hasNarrowQualifier = selectorCategories.some((candidate) => {
				return candidate.startsWith('qualifiers:') && matchers.has(candidate);
			});
			specificCategories = hasNarrowQualifier
				? selectorCategories.filter((candidate) => candidate !== 'qualifiers')
				: selectorCategories;
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
			const inner = property && node.type === 'decl' ? propertyOrders.get(property)!(node.prop).rank : 0;
			return {
				outer: rank, inner, member: 0, category,
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
		const isMatch = (entry: CategorySequence[number]) => isCategoryMatch(entry, item, category, family, matchText);
		const declaration = node.type === 'decl' ? settings?.declarationOrder?.(node.prop) : undefined;
		const inner = declaration?.rank ?? findOrderRank(categoryOrder, isMatch);
		const slot = categoryOrder[inner];
		const matchIndex = declaration?.member ?? (isArray(slot) ? slot.findIndex(isMatch) : 0);
		const match = isArray(slot) ? slot[matchIndex] : slot;

		const innerLabel = match && !isString(match) && !isRegExp(match) ? match.label : undefined;
		const property = match && !isString(match) && 'properties' in match ? match : undefined;
		const scope = `categories.${category}.order.${inner}.${matchIndex}`;
		if (property) {
			return {
				outer: rank, inner, innerScope, member: declaration!.propertyRank, category,
				memberScope: scope,
				label: resolveLabel(property.label, outerSpacing.label, categoryLabel),
				sort: matcherSorter(property), sortScope: `${scope}.sort`,
				spacing: spacing(property, scope), categorySpacing: categoryPolicy,
			};
		}

		const nodeMatcher = match && !isString(match) && 'type' in match ? match : undefined;
		const innerSort = nodeMatcher && matcherSorter(nodeMatcher);
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
			spacing: useUnmatchedSpacing
				? unmatchedSpacing
				: matcherSpacing(nodeMatcher, scope, outerSpacing, selected.group),
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

	return { getRank, getCategoryOrder, getSelectorCategories };
};

export { createOrderConfig, findOrderRank, isCategoryMatch };
