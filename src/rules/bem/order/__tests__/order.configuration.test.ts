import { assert } from '@morev/utils';
import * as v from 'valibot';
import { createDefineRules } from '../../../../create-define-rules';
import rule from '../order';
import { schema } from '../order.schema';
import type { GroupSequence, OrderSequence, OrderSortItem, SecondaryOption, WithinSequence } from '../order.types';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

// @ts-expect-error At-rule shorthand belongs inside within.
const shorthand: OrderSequence = ['@media'];
// @ts-expect-error Standalone regular expressions belong inside within.
const pattern: OrderSequence = [/^@media/];
// @ts-expect-error Group definitions cannot reference other groups.
const reference: GroupSequence = ['group:other'];
// @ts-expect-error The remainder belongs directly in order or within.
const remainder: GroupSequence = ['*'];

testRuleConfig({
	description: 'Shared sequences, groups and category overrides',
	accept: [{
		description: 'Accepts an omitted secondary object',
		config: [true],
	}, {
		description: 'Accepts a shared sequence with groups and category overrides',
		config: [true, {
			root: { order: ['rules', 'group:structural', 'at-rules'], unspecified: 'bottom' },
			unspecified: 'ignore',
			order: [
				'declarations',
				'base',
				'group:side-effects',
				{ type: 'at-rule', name: 'include', hasBlock: false },
				{ type: 'at-rule', name: 'include', hasBlock: true },
				{ type: 'at-rule', name: 'media', parameter: /^\(--tablet\)$/ },
				{ type: 'at-rule', name: 'media', parameter: '(--tablet)' },
				[{ type: 'rule', selector: '&.is-active', name: 'Extra classes' }, 'qualifiers:attribute'],
				'pseudo-classes',
				'context:internal',
				'context:external',
				'modifiers',
				'pseudo-elements',
				'elements',
				'*',
			],
			within: {
				'declarations': ['display', ['width', 'height'], '*'],
				'custom-properties': { order: ['--theme'], unspecified: 'top', sort: (items) => items },
				'pseudo-classes': [
					':hover', [':focus', ':focus-visible'],
					{ selectorSet: { equals: [':hover', ':focus-visible'] } },
					{ selectorSet: { includes: [':hover'], size: 2 } },
					':active', '*',
				],
				'pseudo-elements': ['::before', '::after', '*'],
				'elements': { sort: { by: 'name' } },
				'at-rules': {
					order: ['@media(--tablet)', /^@supports\b/, { type: 'at-rule', name: 'container' }, '*'],
					sort: { by: 'length', units: ['rem', 'px'], direction: 'desc', unresolved: 'ignore' },
				},
			},
			groups: {
				'side-effects': [{ type: 'rule', selector: /^>\s*\*$/ }],
				'structural': {
					order: [{ type: 'rule', relativeSelector: '&:empty' }],
					sort: (items) => items,
				},
			},
			separators: { element: '__' },
		} as const satisfies SecondaryOption],
	}],
});

testRuleConfig({
	description: 'Sequence structure and placement policies',
	reject: [
		{ description: 'Rejects obsolete group objects', config: [true, { order: [{ group: 'early' }] }] },
		{ description: 'Rejects arrays deeper than equal-rank groups', config: [true, { order: [[[':hover']]] }] },
		{ description: 'Rejects unknown categories', config: [true, { within: { states: [] } }] },
		{ description: 'Rejects unknown placement policies', config: [true, { unspecified: 'unknown' }] },
		{ description: 'Validates root placement policies', config: [true, { root: { unspecified: 'unknown' } }] },
		{
			description: 'Validates category placement policies',
			config: [true, { within: { declarations: { unspecified: 'unknown' } } }],
		},
		{ description: 'Rejects unsupported root grouping', config: [true, { root: { groupBy: 'block' } }] },
	],
});

testRuleConfig({
	description: 'Selector-set constraints',
	reject: [
		{
			description: 'Requires mutually exclusive exact and inclusive requirements',
			config: [true, { within: { 'pseudo-classes': [{
				selectorSet: { equals: [':hover'], includes: [':active'] },
			}] } }],
		},
		{
			description: 'Requires a single local branch per entry',
			config: [true, { within: { 'pseudo-classes': [{ selectorSet: { equals: [':hover, :active'] } }] } }],
		},
		{
			description: 'Requires the size to accommodate all requested branches',
			config: [true, { within: { 'pseudo-classes': [{
				selectorSet: { includes: [':hover', ':active'], size: 1 },
			}] } }],
		},
		{
			description: 'Requires distinct selector branches',
			config: [true, { within: { 'pseudo-classes': [{ selectorSet: { equals: [':hover', ':hover'] } }] } }],
		},
	],
});

testRuleConfig({
	description: 'Sorting presets',
	accept: [
		{ description: 'Accepts ascending names by default', config: [true, { within: { 'at-rules': {
			sort: { by: 'name' },
		} } }] },
		{ description: 'Accepts descending names', config: [true, { within: { 'at-rules': {
			sort: { by: 'name', direction: 'desc' },
		} } }] },
		{ description: 'Accepts length sorting without unit priorities', config: [true, { within: { 'at-rules': {
			sort: { by: 'length' },
		} } }] },
		{ description: 'Accepts empty unit priorities', config: [true, { within: { 'at-rules': {
			sort: { by: 'length', units: [] },
		} } }] },
	],
	reject: [
		{ description: 'Rejects unknown presets', config: [true, { within: { elements: { sort: 'unknown' } } }] },
		{ description: 'Rejects invalid group sorters', config: [true, { groups: { media: { order: [], sort: false } } }] },
		{ description: 'Requires distinct units regardless of case', config: [true, { within: { 'at-rules': {
			sort: { by: 'length', units: ['rem', 'REM'] },
		} } }] },
		{ description: 'Rejects units in name presets', config: [true, { within: { 'at-rules': {
			sort: { by: 'name', units: ['rem'] },
		} } }] },
		{ description: 'Rejects invalid directions', config: [true, { within: { 'at-rules': {
			sort: { by: 'name', direction: 'sideways' },
		} } }] },
		{ description: 'Rejects removed string presets', config: [true, { within: { 'at-rules': { sort: 'alphabetical' } } }] },
		{
			description: 'Rejects removed string presets in groups',
			config: [true, { groups: { custom: { order: ['rules'], sort: 'alphabetical' } } }],
		},
		{ description: 'Rejects removed string presets in selector lists', config: [true, { selectorList: { sort: 'alphabetical' } }] },
		{
			description: 'Restricts selector-list sorting to names',
			config: [true, { selectorList: { sort: { by: 'length', units: ['rem'] } } }],
		},
	],
});

testRuleConfig({
	description: 'Explicit outer matchers',
	reject: [
		{ description: 'Rejects at-rule shorthand outside within', config: [true, { order: shorthand }] },
		{ description: 'Rejects standalone regular expressions outside within', config: [true, { order: pattern }] },
		{ description: 'Rejects shorthand inside equal-rank outer groups', config: [true, { order: [[':hover']] }] },
		{ description: 'Rejects shorthand in named groups', config: [true, { groups: { media: ['@media'] } }] },
		{ description: 'Rejects empty group references', config: [true, { order: ['group:'] }] },
		{ description: 'Rejects at-rule fields on rule matchers', config: [true, { order: [{ type: 'rule', hasBlock: true }] }] },
		{
			description: 'Rejects mutually exclusive selector fields',
			config: [true, { order: [{ type: 'rule', selector: '.card', relativeSelector: '&' }] }],
		},
	],
});

testRuleConfig({
	description: 'Group references',
	reject: [
		{ description: 'Rejects references inside group definitions', config: [true, { groups: { custom: reference } }] },
		{ description: 'Rejects the remainder inside group definitions', config: [true, { groups: { custom: remainder } }] },
		{
			description: 'Rejects references inside equal-rank group members',
			config: [true, { groups: { custom: [['group:other']] } }],
		},
		{ description: 'Rejects equal-rank remainders in groups', config: [true, { groups: { custom: [['*']] } }] },
		{ description: 'Rejects references inside within', config: [true, { within: { 'pseudo-classes': ['group:custom'] } }] },
		{
			description: 'Rejects equal-rank references inside within',
			config: [true, { within: { 'pseudo-classes': [['group:custom']] } }],
		},
		{
			description: 'Validates group references returned by transformers',
			config: [true, { within: { 'pseudo-classes': () => ['group:custom'] } }],
		},
		{ description: 'Requires defined outer groups', config: [true, { order: ['group:missing'] }] },
		{ description: 'Requires defined root groups', config: [true, { root: { order: ['group:missing'] } }] },
	],
});

testRuleConfig({
	description: 'Terminal remainder markers',
	reject: [
		{ description: 'Requires the remainder to end the outer order', config: [true, { order: ['*', 'base'] }] },
		{ description: 'Requires the remainder to end the root order', config: [true, { root: { order: ['*', 'rules'] } }] },
		{ description: 'Rejects equal-rank remainders', config: [true, { order: [['*']] }] },
		{
			description: 'Requires the remainder to end category orders',
			config: [true, { within: { declarations: ['*', 'display'] } }],
		},
		{
			description: 'Validates remainder markers returned by transformers',
			config: [true, { within: { declarations: () => [['*']] } }],
		},
	],
});

describe('bem/order configuration types and transformations', () => {
	it('Composes defaults without flattening equal-rank entries', () => {
		const defineRules = createDefineRules();
		const rules = defineRules({
			'@morev/bem/order': [true, {
				within: {
					'elements': {
						sort: (items) => {
							expectTypeOf(items).toEqualTypeOf<readonly OrderSortItem[]>();

							return items;
						},
					},
					'dollar-variables': (defaults) => {
						expectTypeOf(defaults).toEqualTypeOf<WithinSequence>();

						return [/^\$_/, ...defaults];
					},
				},
			}],
		});
		const parsed = v.parse(schema.secondary, rules['@morev/bem/order'][1]);
		const transform = parsed?.within?.['dollar-variables'];
		const defaults = [['$size', '$gap'], '*'] as const;

		assert(typeof transform === 'function');

		expect(transform(defaults)).toStrictEqual([/^\$_/, ['$size', '$gap'], '*']);
		expect(defaults).toStrictEqual([['$size', '$gap'], '*']);
	});
});
