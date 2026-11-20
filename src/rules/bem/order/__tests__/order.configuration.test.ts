import { assert, isFunction, isUndefined } from '@morev/utils';
import * as v from 'valibot';
import { createDefineRules } from '../../../../create-define-rules';
import rule from '../order';
import { schema } from '../order.schema';
import type { AtRuleWithinMatcher, GroupSequence, OrderSortItem, SecondaryOption, WithinSequence } from '../order.types';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

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
					order: [
						{ type: 'at-rule', name: 'media', parameter: '(--tablet)' },
						{ type: 'at-rule', name: 'supports' },
						{ type: 'at-rule', name: 'container' }, '*',
					],
					sort: { by: 'dimension', units: ['rem', 'px'], direction: 'desc', unresolved: 'ignore' },
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
	description: 'Blank line policies and conditions',
	accept: [{
		description: 'Accepts group policies and expanded placement settings at each level',
		config: [true, {
			order: ['group:layout', '*'],
			groups: { layout: {
				properties: ['display', 'position'],
				blankLines: {
					before: {
						default: 'always',
						rules: [{
							when: { any: ['first-nested', 'inside-single-line-block', { maxItems: 0, scope: 'group' }] },
							mode: 'never',
						}],
					},
					after: {
						rules: [{
							when: { all: [{ not: 'last-nested' }, { minItems: 0, scope: 'next-group' }] },
							mode: 'always',
						}],
					},
					between: 'ignore',
				},
			} },
			unspecified: { position: 'bottom', blankLines: { before: 'ignore' } },
			root: { unspecified: { position: 'top', blankLines: { between: 'never' } } },
			within: { declarations: {
				unspecified: { position: 'bottom', blankLines: { before: {
					default: 'always',
					rules: [{ when: { any: ['first-nested', 'inside-single-line-block'] }, mode: 'ignore' }],
				} } },
			} },
		} as const satisfies SecondaryOption],
	}],

	reject: [{
		description: 'Rejects unknown blank line modes',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: { before: 'sometimes' } } } }],
	}, {
		description: 'Requires a mode for each conditional rule',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: 'first-nested' }] },
		} } } }],
	}, {
		description: 'Rejects unknown conditions',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { not: 'unknown' }, mode: 'ignore' }] },
		} } } }],
	}, {
		description: 'Requires nonnegative minimum item counts',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { minItems: -1, scope: 'container' }, mode: 'always' }] },
		} } } }],
	}, {
		description: 'Requires integer minimum item counts',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { minItems: 1.5, scope: 'container' }, mode: 'never' }] },
		} } } }],
	}, {
		description: 'Requires nonnegative maximum item counts',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { maxItems: -1, scope: 'group' }, mode: 'always' }] },
		} } } }],
	}, {
		description: 'Requires integer maximum item counts',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { maxItems: 1.5, scope: 'group' }, mode: 'always' }] },
		} } } }],
	}, {
		description: 'Rejects unknown item counting scopes',
		config: [true, { groups: { layout: { properties: ['display'], blankLines: {
			before: { rules: [{ when: { maxItems: 1, scope: 'file' }, mode: 'never' }] },
		} } } }],
	}, {
		description: 'Requires a position for expanded unspecified settings',
		config: [true, { unspecified: { blankLines: { before: 'always' } } }],
	}, {
		description: 'Requires formatted unspecified content to participate in placement',
		config: [true, { within: { declarations: {
			unspecified: { position: 'ignore', blankLines: { before: 'always' } },
		} } }],
	}],
});

testRuleConfig({
	description: 'Selector-set constraints',
	accept: [{
		description: 'Distinguishes repeated conditions and pseudo-element stages',
		config: [true, { within: { 'pseudo-classes': [{ selectorSet: {
			equals: ['.foo:hover', '.foo.foo:hover', ':hover::before', '::before:hover'],
		} }] } }],
	}],
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
		{
			description: 'Rejects equivalent branches in an exact set regardless of condition order',
			config: [true, { within: { 'pseudo-classes': [{ selectorSet: {
				equals: [':hover.foo', '.foo:hover'],
			} }] } }],
		},
		{
			description: 'Rejects equivalent required branches regardless of condition order',
			config: [true, { within: { 'pseudo-classes': [{ selectorSet: {
				includes: [':hover.foo', '.foo:hover'], size: 2,
			} }] } }],
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
		{ description: 'Accepts dimension sorting without unit priorities', config: [true, { within: { 'at-rules': {
			sort: { by: 'dimension' },
		} } }] },
		{ description: 'Accepts empty unit priorities', config: [true, { within: { 'at-rules': {
			sort: { by: 'dimension', units: [] },
		} } }] },
	],
	reject: [
		{ description: 'Rejects unknown presets', config: [true, { within: { elements: { sort: 'unknown' } } }] },
		{ description: 'Rejects invalid group sorters', config: [true, { groups: { media: { order: [], sort: false } } }] },
		{ description: 'Requires distinct units regardless of case', config: [true, { within: { 'at-rules': {
			sort: { by: 'dimension', units: ['rem', 'REM'] },
		} } }] },
		{ description: 'Rejects units in name presets', config: [true, { within: { 'at-rules': {
			sort: { by: 'name', units: ['rem'] },
		} } }] },
		{ description: 'Rejects invalid directions', config: [true, { within: { 'at-rules': {
			sort: { by: 'name', direction: 'sideways' },
		} } }] },
		{
			description: 'Restricts selector-list sorting to names',
			config: [true, { selectorList: { sort: { by: 'dimension', units: ['rem'] } } }],
		},
	],
});

testRuleConfig({
	description: 'Explicit outer matchers',
	reject: [
		{ description: 'Rejects empty group references', config: [true, { order: ['group:'] }] },
		{ description: 'Rejects at-rule fields on rule matchers', config: [true, { order: [{ type: 'rule', hasBlock: true }] }] },
		{
			description: 'Rejects mutually exclusive selector fields',
			config: [true, { order: [{ type: 'rule', selector: '.card', relativeSelector: '&' }] }],
		},
	],
});

testRuleConfig({
	description: 'Explicit category-local at-rule matchers',
	accept: [
		{
			description: 'Accepts at-rule objects with equal ranks and a terminal remainder',
			config: [true, { within: { 'at-rules': [
				[
					{ type: 'at-rule', name: 'include', hasBlock: false },
					{ type: 'at-rule', name: 'include', hasBlock: true },
				],
				{ type: 'at-rule', name: 'media', parameter: /^\(min-width:/u },
				'*',
			] } }],
		},
		{
			description: 'Accepts explicit at-rule matchers returned by transformers',
			config: [true, { within: { 'at-rules': (defaults: WithinSequence<AtRuleWithinMatcher>) => [
				{ type: 'at-rule', name: 'supports' }, ...defaults,
			] } }],
		},
	],
	reject: [
		{ description: 'Rejects other strings in at-rule orders', config: [true, { within: { 'at-rules': ['media'] } }] },
		{
			description: 'Rejects non-at-rule objects in at-rule orders',
			config: [true, { within: { 'at-rules': [{ type: 'rule', selector: '.card' }] } }],
		},
		{
			description: 'Requires the remainder to end at-rule orders',
			config: [true, { within: { 'at-rules': ['*', { type: 'at-rule', name: 'media' }] } }],
		},
		{
			description: 'Rejects equal-rank remainders returned by at-rule transformers',
			config: [true, { within: { 'at-rules': () => [['*']] } }],
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
					'sass:variables': (defaults) => {
						expectTypeOf(defaults).toEqualTypeOf<WithinSequence>();

						return [/^\$_/, ...defaults];
					},
					'at-rules': {
						order: (defaults) => {
							expectTypeOf(defaults).toEqualTypeOf<WithinSequence<AtRuleWithinMatcher>>();

							return [{ type: 'at-rule', name: 'media' }, ...defaults];
						},
					},
				},
			}],
		});
		const parsed = v.parse(schema.secondary, rules['@morev/bem/order'][1]);
		const transform = parsed?.within?.['sass:variables'];
		const atRules = parsed?.within?.['at-rules'];
		const defaults = [['$size', '$gap'], '*'] as const;

		assert(isFunction(transform));

		expect(transform(defaults)).toStrictEqual([/^\$_/, ['$size', '$gap'], '*']);
		expect(defaults).toStrictEqual([['$size', '$gap'], '*']);

		assert(!isUndefined(atRules) && 'order' in atRules && isFunction(atRules.order));

		expect(atRules.order(['*'])).toStrictEqual([{ type: 'at-rule', name: 'media' }, '*']);
	});
});
