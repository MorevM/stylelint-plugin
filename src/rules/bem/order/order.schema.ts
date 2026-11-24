import { arrayUnique, isArray, isFunction, isString, isUndefined, tsObject } from '@morev/utils';
import * as v from 'valibot';
import { vFunction, vReadonly, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { normalizeLocalSelector } from './utils/normalize-local-selector/normalize-local-selector';
import type {
	AtRuleCategoryMatcher,
	AtRuleMatcher,
	BlankLineCondition,
	BlankLinePolicy,
	BlankLines,
	CategoryMatcher,
	CategoryOrder,
	CategorySequence,
	GroupMatcher,
	GroupOrder,
	GroupSequence,
	OrderCategory,
	OrderMatcher,
	OrderSequence,
	OrderSort,
	OrderSorter,
	OrderSortPreset,
	PrimaryOption,
	PropertiesGroup,
	PropertiesSequence,
	QueryCategoryMatcher,
	RuleMatcher,
	SecondaryOption,
	SelectorListOrder,
	SelectorListSequence,
	SelectorSetMatcher,
	UnspecifiedOrder,
	UnspecifiedOrderOptions,
} from './order.types';

const vOrderCategory = v.picklist([
	'sass:variables',
	'sass:functions',
	'sass:mixins',
	'sass:includes',
	'sass:include-statements',
	'sass:include-blocks',
	'sass:diagnostics',
	'sass:placeholders',
	'css:functions',
	'css:mixins',
	'css:media',
	'css:container',
	'custom-properties',
	'declarations',
	'at-rules',
	'rules',
	'base',
	'pseudo-classes',
	'pseudo-classes:pseudo-element',
	'qualifiers',
	'qualifiers:class',
	'qualifiers:attribute',
	'qualifiers:type',
	'context:internal',
	'context:external',
	'modifiers',
	'pseudo-elements',
	'elements',
]) satisfies v.GenericSchema<OrderCategory>;

const vGroupReference = v.pipe(
	v.string(),
	v.startsWith('group:'),
	v.minLength('group:'.length + 1),
) as v.GenericSchema<`group:${string}`>;

/**
 * Each sequence can assign one priority to its remaining members.
 *
 * @param   sequence   Order entries being validated.
 *
 * @returns            Whether the remainder appears at most once, outside equal-rank groups.
 */
const hasValidRemainder = (sequence: readonly unknown[]) =>
	sequence.indexOf('*') === sequence.lastIndexOf('*')
	&& sequence.every((entry) => !isArray(entry) || !entry.includes('*'));
const remainderMessage = 'Use * at most once per sequence, outside equal-rank groups';

// Callback result validation must preserve description identities rather than clone parsed objects.
const vOrderSorter = v.custom<OrderSorter>(isFunction, 'Expected a synchronous sorting function');
const vUnspecifiedOrder: v.GenericSchema<UnspecifiedOrder> = v.picklist(['top', 'bottom', 'ignore']);
const vDirection = v.optional(v.picklist(['asc', 'desc']));
const vUnits = v.pipe(
	vReadonly(v.array(v.pipe(v.string(), v.regex(/^[a-z]+$/iu)))),
	v.check((units) => arrayUnique(units.map((unit) => unit.toLowerCase())).length === units.length,
		'Each unit must have exactly one priority'),
);
const vNameSortPreset = v.strictObject({ by: v.literal('name'), direction: vDirection });
const vOrderSortPreset: v.GenericSchema<OrderSortPreset> = v.union([
	vNameSortPreset,
	v.strictObject({
		by: v.literal('dimension'),
		units: v.optional(vUnits),
		direction: vDirection,
		unresolved: v.optional(vUnspecifiedOrder),
	}),
]);

const vOrderSort: v.GenericSchema<OrderSort> = v.union([vOrderSorter, vOrderSortPreset]);
const vLabel = v.optional(v.string());

const vItemThreshold = v.pipe(v.number(), v.integer(), v.minValue(0));
const vItemScope = v.optional(v.picklist(['container', 'group', 'previous-group', 'next-group']));
const vBlankLineMode = v.picklist(['always', 'never', 'ignore']);
const vBlankLineCondition = v.lazy(getBlankLineExpression);
const vBlankLineConditions = vReadonly(v.tupleWithRest([vBlankLineCondition], vBlankLineCondition));
const vBlankLineExpression = v.union([
	v.picklist(['first-nested', 'last-nested', 'inside-single-line-block', 'separated-by-comment']),
	v.strictObject({ minItems: vItemThreshold, scope: vItemScope }),
	v.strictObject({ maxItems: vItemThreshold, scope: vItemScope }),
	v.strictObject({ any: vBlankLineConditions }),
	v.strictObject({ all: vBlankLineConditions }),
	v.strictObject({ not: vBlankLineCondition }),
]) satisfies v.GenericSchema<BlankLineCondition>;

function getBlankLineExpression(): v.GenericSchema<BlankLineCondition> {
	return vBlankLineExpression;
}

const vBlankLineRule = v.strictObject({ when: vBlankLineCondition, mode: vBlankLineMode });
const vBlankLinePolicy: v.GenericSchema<BlankLinePolicy> = v.union([
	vBlankLineMode,
	v.strictObject({
		default: v.optional(vBlankLineMode),
		rules: vReadonly(v.tupleWithRest([vBlankLineRule], vBlankLineRule)),
	}),
]);
const vBlankLines: v.GenericSchema<BlankLines> = v.strictObject({
	before: v.optional(vBlankLinePolicy),
	after: v.optional(vBlankLinePolicy),
	between: v.optional(vBlankLinePolicy),
});
const vUnspecifiedOrderOptions: v.GenericSchema<UnspecifiedOrder | UnspecifiedOrderOptions> = v.union([
	vUnspecifiedOrder,
	v.strictObject({ position: v.picklist(['top', 'bottom']), label: vLabel, blankLines: v.optional(vBlankLines) }),
]);
const groupSpacingEntries = {
	blankLines: v.optional(vBlankLines),
	label: vLabel,
};

const vAtRuleMatcher: v.GenericSchema<AtRuleMatcher> = v.strictObject({
	type: v.literal('at-rule'),
	name: v.optional(v.string()),
	parameter: v.optional(vStringOrRegExpSchema),
	hasBlock: v.optional(v.boolean()),
	sort: v.optional(vOrderSort),
	...groupSpacingEntries,
});

const vLocalSelectors = v.pipe(
	vReadonly(v.array(v.pipe(v.string(), v.check((value) => !isUndefined(normalizeLocalSelector(value)),
		'Use a single local selector branch without &')))),
	v.minLength(1),
	v.check((selectors) => {
		return arrayUnique(selectors.map((value) => normalizeLocalSelector(value))).length === selectors.length;
	}, 'Each selector branch must be distinct'),
);
const vBranchCount = v.pipe(v.number(), v.integer(), v.minValue(1));
const vOptionalBranches = v.optional(vLocalSelectors);
const vOptionalCount = v.optional(vBranchCount);
const vSelectorSetRange = v.pipe(
	v.union([
		v.strictObject({ includes: vLocalSelectors, minSize: vOptionalCount, maxSize: vOptionalCount }),
		v.strictObject({ includes: vOptionalBranches, minSize: vBranchCount, maxSize: vOptionalCount }),
		v.strictObject({ includes: vOptionalBranches, minSize: vOptionalCount, maxSize: vBranchCount }),
	]),
	v.check(({ minSize, maxSize }) => isUndefined(maxSize) || (minSize ?? 1) <= maxSize,
		'minSize must not exceed maxSize'),
	v.check(({ includes, maxSize }) => isUndefined(maxSize) || (includes?.length ?? 0) <= maxSize,
		'maxSize must accommodate every required branch'),
);
const vSelectorSetMatcher = v.strictObject({
	label: vLabel,
	selectorSet: v.union([
		v.strictObject({ equals: vLocalSelectors }),
		v.pipe(v.strictObject({ includes: vOptionalBranches, size: vBranchCount }),
			v.check(({ includes, size }) => (includes?.length ?? 0) <= size, 'Size must accommodate every required branch')),
		vSelectorSetRange,
	]),
}) satisfies v.GenericSchema<SelectorSetMatcher>;

const vRuleSelector = v.strictObject({
	type: v.literal('rule'),
	selector: v.optional(vStringOrRegExpSchema),
	relativeSelector: v.optional(vStringOrRegExpSchema),
	label: vLabel,
});
const vExclusiveSelector = v.check(
	(matcher: v.InferOutput<typeof vRuleSelector>) => (
		isUndefined(matcher.selector) || isUndefined(matcher.relativeSelector)
	),
	'Use either selector or relativeSelector',
);
const vRuleMatcher: v.GenericSchema<RuleMatcher> = v.pipe(
	v.strictObject({
		...vRuleSelector.entries,
		selectorSet: v.optional(vSelectorSetMatcher.entries.selectorSet),
		sort: v.optional(vOrderSort),
		blankLines: v.optional(vBlankLines),
	}),
	vExclusiveSelector,
);

const vPropertyMatcher = v.union([v.pipe(v.string(), v.minLength(1)), v.instance(RegExp)]);
const vPropertiesSequence: v.GenericSchema<PropertiesSequence> = v.pipe(vReadonly(v.array(v.union([
	vPropertyMatcher,
	vReadonly(v.array(vPropertyMatcher)),
]))), v.minLength(1), v.check((sequence) => hasValidRemainder(sequence), remainderMessage));
const vPropertiesGroup: v.GenericSchema<PropertiesGroup> = v.strictObject({
	properties: vPropertiesSequence,
	sort: v.optional(vOrderSort),
	...groupSpacingEntries,
});
const vGroupMatcher: v.GenericSchema<GroupMatcher> = v.union([
	vOrderCategory, vAtRuleMatcher, vRuleMatcher, vPropertiesGroup,
]);
const vOrderMatcher: v.GenericSchema<OrderMatcher> = v.union([
	vGroupMatcher, vGroupReference, v.literal('*'),
]);
const vOrderSequence: v.GenericSchema<OrderSequence> = v.pipe(vReadonly(v.array(v.union([
	vOrderMatcher,
	vReadonly(v.array(vOrderMatcher)),
]))), v.check((sequence) => hasValidRemainder(sequence), remainderMessage));
const vGroupSequence: v.GenericSchema<GroupSequence> = vReadonly(v.array(v.union([
	vGroupMatcher,
	vReadonly(v.array(vGroupMatcher)),
])));

const vGroupOrder: v.GenericSchema<GroupOrder> = v.union([
	vGroupSequence,
	vPropertiesGroup,
	v.strictObject({ order: vGroupSequence, sort: v.optional(vOrderSort), ...groupSpacingEntries }),
]);

const vCategoryString = v.pipe(v.string(), v.regex(/^(?!group:|@)/u));
const vCategoryMatcher = v.union([
	vCategoryString, v.instance(RegExp), vAtRuleMatcher, vRuleMatcher, vSelectorSetMatcher, vPropertiesGroup,
]);

/**
 * Validates category-specific matchers in direct sequences and transformer results.
 *
 * @param   matcher   Constraints accepted by this category.
 *
 * @returns           Category order schema with shared sorting and spacing settings.
 */
const createCategoryOrderSchema = <Matcher extends CategoryMatcher>(matcher: v.GenericSchema<Matcher>) => {
	const sequence: v.GenericSchema<CategorySequence<Matcher>> = v.pipe(vReadonly(v.array(v.union([
		matcher,
		vReadonly(v.array(matcher)),
	]))), v.check((sequence) => hasValidRemainder(sequence), remainderMessage));
	const order = v.union([sequence, vFunction([sequence], sequence)]);

	return v.union([
		order,
		v.strictObject({
			order: v.optional(order),
			label: vLabel,
			unspecified: v.optional(vUnspecifiedOrderOptions),
			sort: v.optional(vOrderSort),
			blankLines: v.optional(vBlankLines),
		}),
	]) satisfies v.GenericSchema<CategoryOrder<Matcher>>;
};

const vCategoryOrder = createCategoryOrderSchema(vCategoryMatcher);
const vAtRuleCategoryOrder = createCategoryOrderSchema<AtRuleCategoryMatcher>(
	v.union([vAtRuleMatcher, v.literal('*')]),
);
const vQueryCategoryOrder = createCategoryOrderSchema<QueryCategoryMatcher>(
	v.union([vCategoryString, v.instance(RegExp), vAtRuleMatcher]),
);
const vOptionalCategoryOrder = v.optional(vCategoryOrder);
const categoryEntries: Record<OrderCategory, typeof vOptionalCategoryOrder> = tsObject.fromEntries(
	vOrderCategory.options.map((category) => [category, vOptionalCategoryOrder] as const),
);
const vCategories = vReadonly(v.strictObject({
	...categoryEntries,
	'at-rules': v.optional(vAtRuleCategoryOrder),
	'css:media': v.optional(vQueryCategoryOrder),
	'css:container': v.optional(vQueryCategoryOrder),
}));

const vSelectorListMatcher = v.union([vCategoryString, v.instance(RegExp), v.pipe(vRuleSelector, vExclusiveSelector)]);
const vSelectorListSequence: v.GenericSchema<SelectorListSequence> = v.pipe(vReadonly(v.array(v.union([
	vSelectorListMatcher, vReadonly(v.array(vSelectorListMatcher)),
]))), v.check((sequence) => hasValidRemainder(sequence), remainderMessage));
const vSelectorListOrder: v.GenericSchema<SelectorListOrder> = v.strictObject({
	order: v.optional(v.union([v.literal('inherit'), vSelectorListSequence])),
	unspecified: v.optional(vUnspecifiedOrder),
	sort: v.optional(vNameSortPreset),
});

export const schema = {
	primary: v.literal(true) satisfies v.GenericSchema<PrimaryOption>,
	secondary: v.optional(v.pipe(v.object({
		order: v.optional(vOrderSequence),
		unspecified: v.optional(vUnspecifiedOrderOptions),
		root: v.optional(v.strictObject({
			order: v.optional(vOrderSequence),
			unspecified: v.optional(vUnspecifiedOrderOptions),
		})),
		categories: v.optional(vCategories),
		groups: v.optional(vReadonly(v.record(v.string(), vGroupOrder))),
		selectorList: v.optional(v.union([v.literal(false), vSelectorListOrder])),
		separators: vSeparatorsSchema,
	}), v.check((options) => [...(options.order ?? []), ...(options.root?.order ?? [])].flat().every((matcher) => {
		return !isString(matcher) || !matcher.startsWith('group:')
			|| Object.hasOwn(options.groups ?? {}, matcher.slice('group:'.length));
	}), 'Every referenced group must be defined')) satisfies v.GenericSchema<SecondaryOption>),
};

export { vOrderSortPreset };
