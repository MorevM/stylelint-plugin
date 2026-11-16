import { arrayUnique, isArray, isFunction, isString, isUndefined } from '@morev/utils';
import * as v from 'valibot';
import { vFunction, vReadonly, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { normalizeLocalSelector } from './utils/normalize-local-selector/normalize-local-selector';
import type {
	AtRuleMatcher,
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
	WithinOrder,
	WithinSequence,
} from './order.types';

const vOrderCategory: v.GenericSchema<OrderCategory> = v.picklist([
	'dollar-variables',
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
]);

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
		by: v.literal('length'),
		units: v.optional(vUnits),
		direction: vDirection,
		unresolved: v.optional(vUnspecifiedOrder),
	}),
]);

const vOrderSort: v.GenericSchema<OrderSort> = v.union([vOrderSorter, vOrderSortPreset]);
const vEmptyLineBefore = v.picklist(['always', 'never', 'threshold']);
const vPropertyThreshold = v.pipe(v.number(), v.integer(), v.minValue(0));
const groupSpacingEntries = {
	emptyLineBefore: v.optional(vEmptyLineBefore),
	noEmptyLineBetween: v.optional(v.boolean()),
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

const vWithinString = v.pipe(v.string(), v.regex(/^(?!group:)/u));
const vWithinMatcher = v.union([
	vWithinString, v.instance(RegExp), vAtRuleMatcher, vRuleMatcher, vSelectorSetMatcher, vPropertiesGroup,
]);

const vWithinSequence: v.GenericSchema<WithinSequence> = v.pipe(vReadonly(v.array(v.union([
	vWithinMatcher,
	vReadonly(v.array(vWithinMatcher)),
]))), v.check((sequence) => hasTerminalRemainder(sequence), 'Place * only at the end of the sequence'));

const vWithinOrderSequence = v.union([
	vWithinSequence,
	vFunction([vWithinSequence], vWithinSequence),
]);

const vWithinOrder: v.GenericSchema<WithinOrder> = v.union([
	vWithinOrderSequence,
	v.strictObject({
		order: v.optional(vWithinOrderSequence),
		unspecified: v.optional(vUnspecifiedOrder),
		sort: v.optional(vOrderSort),
		emptyLineBeforeUnspecified: v.optional(vEmptyLineBefore),
		emptyLineMinimumPropertyThreshold: v.optional(vPropertyThreshold),
	}),
]);

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
		unspecified: v.optional(vUnspecifiedOrder),
		root: v.optional(v.strictObject({
			order: v.optional(vOrderSequence),
			unspecified: v.optional(vUnspecifiedOrder),
		})),
		within: v.optional(vReadonly(v.record(vOrderCategory, v.optional(vWithinOrder)))),
		groups: v.optional(vReadonly(v.record(v.string(), vGroupOrder))),
		selectorList: v.optional(v.union([v.literal(false), vSelectorListOrder])),
		emptyLineMinimumPropertyThreshold: v.optional(vPropertyThreshold),
		separators: vSeparatorsSchema,
	}), v.check((options) => [...(options.order ?? []), ...(options.root?.order ?? [])].flat().every((matcher) => {
		return !isString(matcher) || !matcher.startsWith('group:')
			|| Object.hasOwn(options.groups ?? {}, matcher.slice('group:'.length));
	}), 'Every referenced group must be defined')) satisfies v.GenericSchema<SecondaryOption>),
};

export { vOrderSortPreset };
