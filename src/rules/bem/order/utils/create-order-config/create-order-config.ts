import { isArray, isFunction, isRegExp, isString, tsObject } from '@morev/utils';
import selectorParser from 'postcss-selector-parser';
import { DEFAULT_ORDER, DEFAULT_ROOT_ORDER, DEFAULT_WITHIN, REMAINDER } from '../../order.constants';
import { createOrderSorter } from '../create-order-sorter/create-order-sorter';
import { getOrderHeader } from '../get-order-header/get-order-header';
import { matchesSelectorSet } from '../matches-selector-set/matches-selector-set';
import { normalizeParameters } from '../normalize-parameters/normalize-parameters';
import { normalizeProperty } from '../normalize-property/normalize-property';
import type { Family, OrderItem, OrderRank, PreparedOrderSorter, PreparedOrderSpacing } from '../../order.internal-types';
import type {
	AtRuleMatcher, OrderCategory, OrderGroupSpacing, OrderMatcher, OrderSequence,
	PropertiesGroup, RuleMatcher, SecondaryOption,
	UnspecifiedOrder, WithinMatcher, WithinOrder, WithinOrderOptions, WithinSequence,
} from '../../order.types';

/**
 * Expanded matcher with the sorting policy of the named group that supplied it.
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
	 * Group-specific sorting callback, when the definition supplies one.
	 */
	sort?: PreparedOrderSorter;

	/**
	 * Stable configuration path, including anonymous groups.
	 */
	scope: string;

	/**
	 * Formatting retained when a named fragment expands to several ranks.
	 */
	spacing?: PreparedOrderSpacing;
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
	if (pattern === undefined) return true;
	if (value === undefined) return false;
	if (isString(pattern)) return pattern === value;

	// A shared /g or /y matcher must not carry state between nodes or lint runs.
	return new RegExp(pattern.source, pattern.flags).test(value);
};

/**
 * Matches property names against wildcards, normalized names or regular expressions.
 *
 * @param   matcher    Property constraint from the configured order.
 * @param   property   Authored declaration name.
 *
 * @returns            Whether the authored or normalized property satisfies the constraint.
 */
const matchesProperty = (matcher: string | RegExp, property: string) => {
	if (isString(matcher)) return matcher === '*' || normalizeProperty(matcher) === normalizeProperty(property);
	return matchesValue(matcher, property) || matchesValue(matcher, normalizeProperty(property));
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

	return group.properties.findIndex((entry) => (isArray(entry) ? entry : [entry])
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
		return node.type === 'rule'
			&& matchesValue(matcher.selector, node.selector)
			&& matchesValue(matcher.relativeSelector, item.selector?.relativeSelector);
	}

	return node.type === 'atrule'
		&& (matcher.name === undefined || matcher.name === node.name)
		&& (matcher.hasBlock === undefined || matcher.hasBlock === Boolean(node.nodes))
		&& matchesValue(matcher.parameter, normalizeParameters(node.params));
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
 * @param   matcher   Category-local matcher or equal-rank matcher list.
 * @param   item      Authored unit and its selector metadata.
 * @param   family    Semantic sibling family, when matching a grouped unit.
 *
 * @returns           Whether the unit or family belongs to this priority slot.
 */
const isWithinMatch = (matcher: WithinSequence[number], item: OrderItem, family?: Family): boolean => {
	if (isArray(matcher)) return matcher.some((entry) => isWithinMatch(entry, item, family));
	if (!isString(matcher) && 'properties' in matcher) return getPropertyRank(matcher, item) !== -1;
	if (!isString(matcher) && 'selectorSet' in matcher) {
		return !family && Boolean(item.selector && matchesSelectorSet(matcher.selectorSet, item.selector.localSelectors));
	}

	if (isRegExp(matcher)) {
		if (item.node.type === 'decl') return matchesProperty(matcher, item.node.prop);
		if (item.node.type === 'atrule') return false;

		const header = item.node.type === 'rule'
			? selectorParser().processSync(item.node.selector, { lossless: false })
			: getOrderHeader(item.node);

		return matchesValue(matcher, header);
	}

	if (!isString(matcher)) return 'type' in matcher && matchesObject(matcher, item);
	if (matcher === '*') return true;
	if (!family && item.selector?.isList) return false;
	if (family?.key === matcher || item.selector?.tokens.includes(matcher)) return true;

	const { node } = item;

	return node.type === 'decl' && matchesProperty(matcher, node.prop);
};

/**
 * Resolves a category override using defaults compatible with its matcher contract.
 *
 * @param   override   Optional sequence, transformer or expanded category settings.
 * @param   defaults   Built-in matchers accepted by the same category.
 *
 * @returns            Prepared matchers and policies, or undefined for omitted categories.
 */
const prepareWithinOrder = <Matcher extends WithinMatcher>(
	override: WithinOrder<Matcher> | undefined,
	defaults: WithinSequence<Matcher>,
) => {
	if (override === undefined) return undefined;

	const settings: WithinOrderOptions<Matcher> = isArray(override) || isFunction(override)
		? { order: override }
		: override as WithinOrderOptions<Matcher>;
	const sequence = settings.order ?? defaults;
	const order = isFunction(sequence) ? sequence(defaults) : sequence;

	return {
		order, settings,
		unspecified: settings.unspecified ?? 'bottom' as const,
		sort: settings.sort === undefined ? undefined : createOrderSorter(settings.sort),
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
	const sorters = new WeakMap<PropertiesGroup, PreparedOrderSorter>();

	/**
	 * Prepares and caches a property-group sorter for this configuration.
	 *
	 * @param   group   Property group that may supply a sorting policy.
	 *
	 * @returns         Shared prepared sorter, or undefined when the group has no sorter.
	 */
	const propertySorter = (group: PropertiesGroup) => {
		if (group.sort === undefined) return undefined;
		if (!sorters.has(group)) sorters.set(group, createOrderSorter(group.sort));
		return sorters.get(group);
	};

	/**
	 * Prepares spacing metadata with a stable scope and inherited property threshold.
	 *
	 * @param   settings    Spacing policy from a group or category override.
	 * @param   key         Scope identity used to recognize adjacent members of the same group.
	 * @param   threshold   Category threshold override, when provided.
	 *
	 * @returns             Spacing policy with its effective threshold and scope identity.
	 */
	const spacing = (settings: OrderGroupSpacing, key: string, threshold?: number): PreparedOrderSpacing => ({
		...settings, key, threshold: threshold ?? options.emptyLineMinimumPropertyThreshold ?? 5,
	});

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
				sort: property && propertySorter(property),
				spacing: property && spacing(property, scope),
			}]];
		}

		const group = matcher.slice('group:'.length);
		const definition = options.groups![group];
		if ('properties' in definition) {
			return [[{
				matcher: definition, group, scope: `groups.${group}`,
				sort: propertySorter(definition), spacing: spacing(definition, `groups.${group}`),
			}]];
		}

		const settings = 'order' in definition ? definition : { order: definition };
		const sort = settings.sort === undefined ? undefined : createOrderSorter(settings.sort);

		return settings.order.map((entry, index) => (isArray(entry) ? [...entry] : [entry]).map((member, memberIndex) => {
			const memberScope = `groups.${group}.order.${index}.${memberIndex}`;
			const property = !isString(member) && 'properties' in member ? member : undefined;

			return {
				matcher: member, group,
				scope: property ? memberScope : `groups.${group}`,
				sort: (property && propertySorter(property)) ?? sort,
				spacing: property ? spacing(property, memberScope) : spacing(settings, `groups.${group}`),
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
	const expandOrder = (sequence: OrderSequence, scope: string) => sequence.flatMap((entry, index) => {
		return isArray(entry)
			? [entry.flatMap((matcher, member) => expand(matcher, `${scope}.${index}.${member}`).flat())]
			: expand(entry as OrderMatcher, `${scope}.${index}`);
	});

	const nestedOrder = expandOrder(options.order ?? DEFAULT_ORDER, 'order');
	const rootOrder = expandOrder(options.root?.order ?? DEFAULT_ROOT_ORDER, 'root.order');

	const within = new Map<OrderCategory, {
		order: WithinSequence; unspecified: UnspecifiedOrder; sort?: PreparedOrderSorter;
		settings: Omit<WithinOrderOptions, 'order'>;
	}>();
	const overrides = options.within ?? {};
	for (const category of tsObject.keys(overrides)) {
		const prepared = category === 'at-rules'
			? prepareWithinOrder(overrides[category], REMAINDER)
			: prepareWithinOrder(overrides[category], DEFAULT_WITHIN[category] ?? REMAINDER);
		if (!prepared) continue;

		if (category !== 'declarations' && prepared.order.flat().some((entry) => !isString(entry) && 'properties' in entry)) {
			throw new Error('Property groups are only supported within declarations');
		}

		within.set(category, prepared);
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
		const order = isRoot ? rootOrder : nestedOrder;
		const { node } = item;
		const categories: OrderCategory[] = (() => {
			if (family) return [family.category, 'rules'];
			if (node.type === 'rule') return [...(item.selector?.categories ?? []), 'rules'];
			if (node.type === 'atrule') return ['at-rules'];
			if (node.type !== 'decl') return [];
			if (node.prop.startsWith('$')) return ['dollar-variables'];
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
		const selectorList = !family && item.selector?.isList ? item.selector : undefined;
		let category: OrderCategory = selectorList ? 'rules' : categories[0];
		if (rank === -1 || selectorList) {
			// Resolve list categories from configuration before considering the generic rule fallback.
			const categoryGroups: OrderCategory[][] = selectorList ? [selectorList.categories, ['rules']] : [categories];
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

		if (rank === -1) rank = order.findIndex((entries) => entries.some(({ matcher }) => matcher === '*'));
		if (rank === -1) {
			const unspecified = (isRoot ? options.root?.unspecified : undefined) ?? options.unspecified ?? 'bottom';

			return {
				outer: getUnspecifiedRank(unspecified, order.length), inner: 0, member: 0, category,
			};
		}

		const outerSpacing = selected?.spacing
			? {
				...selected.spacing,
				threshold: within.get(category)?.settings.emptyLineMinimumPropertyThreshold ?? selected.spacing.threshold,
			}
			: undefined;
		if (selected && !isString(selected.matcher) && 'properties' in selected.matcher) {
			return {
				outer: rank, inner: getPropertyRank(selected.matcher, item), member: 0, category,
				innerScope: selected.scope,
				sort: selected.sort, sortScope: `${selected.scope}.sort`, group: selected.group,
				spacing: outerSpacing,
			};
		}

		const settings = within.get(category);
		const categoryOrder = settings?.order ?? DEFAULT_WITHIN[category] ?? REMAINDER;
		const inner = categoryOrder.findIndex((matcher) => isWithinMatch(matcher, item, family));
		const matches = isArray(categoryOrder[inner]) ? categoryOrder[inner] : [categoryOrder[inner]];
		const matchIndex = matches.findIndex((entry) => entry !== undefined && isWithinMatch(entry, item, family));
		const match = matches[matchIndex];

		const outerMatcher = selected?.matcher;
		const outerLabel = outerMatcher && !isString(outerMatcher)
			&& 'type' in outerMatcher && outerMatcher.type === 'rule'
			? outerMatcher.name
			: undefined;
		const innerLabel = match && !isString(match)
			&& 'type' in match && match.type === 'rule'
			? match.name
			: undefined;

		const property = match && !isString(match) && 'properties' in match ? match : undefined;
		const scope = `within.${category}.order.${inner}.${matchIndex}`;
		if (property) {
			return {
				outer: rank, inner, member: getPropertyRank(property, item), category,
				memberScope: scope,
				sort: propertySorter(property), sortScope: `${scope}.sort`,
				spacing: spacing(property, scope, settings?.settings.emptyLineMinimumPropertyThreshold),
			};
		}

		const sort = inner === -1 ? undefined : selected?.sort ?? settings?.sort;
		const unmatchedSpacing = inner === -1 && settings?.unspecified !== 'ignore'
			&& settings?.settings.emptyLineBeforeUnspecified !== undefined
			? spacing({ emptyLineBefore: settings.settings.emptyLineBeforeUnspecified }, `within.${category}.unspecified`, settings.settings.emptyLineMinimumPropertyThreshold)
			: undefined;

		return {
			outer: rank,
			inner: inner === -1 ? getUnspecifiedRank(settings?.unspecified ?? 'bottom', categoryOrder.length) : inner,
			member: 0, category,
			sort,
			sortScope: sort ? (selected?.sort ? `${selected.scope}.sort` : `within.${category}.sort`) : undefined,
			group: selected?.group,
			label: innerLabel ?? outerLabel,
			spacing: unmatchedSpacing ?? outerSpacing,
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
		return within.get(category)?.order ?? DEFAULT_WITHIN[category] ?? REMAINDER;
	};

	return { getRank, getCategoryOrder };
};

export { createOrderConfig, isWithinMatch };
