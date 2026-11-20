import { arrayUnique, isArray, isFunction, isString, isUndefined, tsObject } from '@morev/utils';
import * as v from 'valibot';
import { vFunction, vReadonly, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { normalizeLocalSelector } from './utils/normalize-local-selector/normalize-local-selector';
import type {
	AtRuleMatcher,
	AtRuleWithinMatcher,
	BlankLineCondition,
	BlankLinePolicy,
	BlankLines,
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
	RuleMatcher,
	SecondaryOption,
	SelectorListOrder,
	SelectorListSequence,
	SelectorSetMatcher,
	UnspecifiedOrder,
	UnspecifiedOrderOptions,
	WithinMatcher,
	WithinOrder,
	WithinSequence,
} from './order.types';

const vOrderCategory = v.picklist([
	'sass:variables',
	'sass:functions',
	'sass:mixins',
	'sass:placeholders',
	'css:functions',
	'css:mixins',
	'custom-properties',
	'declarations',
	'at-rules',
	'rules',
	'base',
	'pseudo-classes',
	'qualifiers:class',
	'qualifiers:attribute',
	'context:internal',
	'context:external',
	'modifiers',
	'pseudo-elements',
	'elements',
]) satisfies v.GenericSchema<OrderCategory>;

const vAtRuleMatcher: v.GenericSchema<AtRuleMatcher> = v.strictObject({
	type: v.literal('at-rule'),
	name: v.optional(v.string()),
	parameter: v.optional(vStringOrRegExpSchema),
	hasBlock: v.optional(v.boolean()),
});

const vRuleMatcher: v.GenericSchema<RuleMatcher> = v.pipe(v.strictObject({
	type: v.literal('rule'),
	selector: v.optional(vStringOrRegExpSchema),
	relativeSelector: v.optional(vStringOrRegExpSchema),
	name: v.optional(v.string()),
}), v.check((matcher) => isUndefined(matcher.selector) || isUndefined(matcher.relativeSelector),
	'Use either selector or relativeSelector'));

const vGroupReference = v.pipe(
	v.string(),
	v.startsWith('group:'),
	v.minLength('group:'.length + 1),
) as v.GenericSchema<`group:${string}`>;

/**
 * Rejects remainder matchers inside equal-rank groups or before the end of an order.
 *
 * @param   sequence   Order entries being validated.
 *
 * @returns            Whether every remainder matcher occupies the final top-level slot.
 */
const hasTerminalRemainder = (sequence: readonly unknown[]) => sequence.every((entry, index) => {
	if (isArray(entry)) return !entry.includes('*');
	return entry !== '*' || index === sequence.length - 1;
});

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
	v.strictObject({ position: v.picklist(['top', 'bottom']), blankLines: v.optional(vBlankLines) }),
]);
const groupSpacingEntries = {
	blankLines: v.optional(vBlankLines),
	groupName: v.optional(v.string()),
};
const vPropertyMatcher = v.union([v.pipe(v.string(), v.minLength(1)), v.instance(RegExp)]);
const vPropertiesSequence: v.GenericSchema<PropertiesSequence> = v.pipe(vReadonly(v.array(v.union([
	vPropertyMatcher,
	vReadonly(v.array(vPropertyMatcher)),
]))), v.minLength(1), v.check((sequence) => hasTerminalRemainder(sequence), 'Place * only at the end of the sequence'));
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
]))), v.check((sequence) => hasTerminalRemainder(sequence), 'Place * only at the end of the sequence'));
const vGroupSequence: v.GenericSchema<GroupSequence> = vReadonly(v.array(v.union([
	vGroupMatcher,
	vReadonly(v.array(vGroupMatcher)),
])));

const vGroupOrder: v.GenericSchema<GroupOrder> = v.union([
	vGroupSequence,
	vPropertiesGroup,
	v.strictObject({ order: vGroupSequence, sort: v.optional(vOrderSort), ...groupSpacingEntries }),
]);

const vLocalSelectors = v.pipe(
	vReadonly(v.array(v.pipe(v.string(), v.check((value) => !isUndefined(normalizeLocalSelector(value)),
		'Use a single local selector branch without &')))),
	v.minLength(1),
	v.check((selectors) => {
		return arrayUnique(selectors.map((value) => normalizeLocalSelector(value))).length === selectors.length;
	}, 'Each selector branch must be distinct'),
);
const vSelectorSetMatcher: v.GenericSchema<SelectorSetMatcher> = v.strictObject({
	selectorSet: v.union([
		v.strictObject({ equals: vLocalSelectors }),
		v.pipe(v.strictObject({
			includes: vLocalSelectors,
			size: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
		}), v.check((matcher) => isUndefined(matcher.size) || matcher.size >= matcher.includes.length,
			'Size must accommodate every required branch')),
	]),
});

const vWithinString = v.pipe(v.string(), v.regex(/^(?!group:|@)/u));
const vWithinMatcher = v.union([
	vWithinString, v.instance(RegExp), vAtRuleMatcher, vRuleMatcher, vSelectorSetMatcher, vPropertiesGroup,
]);

/**
 * Validates category-specific matchers in direct sequences and transformer results.
 *
 * @param   matcher   Constraints accepted by this category.
 *
 * @returns           Category order schema with shared sorting and spacing settings.
 */
const createWithinOrderSchema = <Matcher extends WithinMatcher>(matcher: v.GenericSchema<Matcher>) => {
	const sequence: v.GenericSchema<WithinSequence<Matcher>> = v.pipe(vReadonly(v.array(v.union([
		matcher,
		vReadonly(v.array(matcher)),
	]))), v.check((entries) => hasTerminalRemainder(entries), 'Place * only at the end of the sequence'));
	const order = v.union([sequence, vFunction([sequence], sequence)]);

	return v.union([
		order,
		v.strictObject({
			order: v.optional(order),
			unspecified: v.optional(vUnspecifiedOrderOptions),
			sort: v.optional(vOrderSort),
		}),
	]) satisfies v.GenericSchema<WithinOrder<Matcher>>;
};

const vWithinOrder = createWithinOrderSchema(vWithinMatcher);
const vAtRuleWithinOrder = createWithinOrderSchema<AtRuleWithinMatcher>(v.union([vAtRuleMatcher, v.literal('*')]));
const vOptionalWithinOrder = v.optional(vWithinOrder);
const withinEntries: Record<OrderCategory, typeof vOptionalWithinOrder> = tsObject.fromEntries(
	vOrderCategory.options.map((category) => [category, vOptionalWithinOrder] as const),
);
const vWithin = vReadonly(v.strictObject({
	...withinEntries,
	'at-rules': v.optional(vAtRuleWithinOrder),
}));

const vSelectorListMatcher = v.union([vWithinString, v.instance(RegExp), vRuleMatcher]);
const vSelectorListSequence: v.GenericSchema<SelectorListSequence> = v.pipe(vReadonly(v.array(v.union([
	vSelectorListMatcher, vReadonly(v.array(vSelectorListMatcher)),
]))), v.check((sequence) => hasTerminalRemainder(sequence), 'Place * only at the end of the sequence'));
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
		within: v.optional(vWithin),
		groups: v.optional(vReadonly(v.record(v.string(), vGroupOrder))),
		selectorList: v.optional(v.union([v.literal(false), vSelectorListOrder])),
		separators: vSeparatorsSchema,
	}), v.check((options) => [...(options.order ?? []), ...(options.root?.order ?? [])].flat().every((matcher) => {
		return !isString(matcher) || !matcher.startsWith('group:')
			|| Object.hasOwn(options.groups ?? {}, matcher.slice('group:'.length));
	}), 'Every referenced group must be defined')) satisfies v.GenericSchema<SecondaryOption>),
};

export { vOrderSortPreset };
