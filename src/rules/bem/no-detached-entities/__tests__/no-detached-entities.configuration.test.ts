import rule from '../no-detached-entities';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

testRuleConfig({
	description: 'Secondary option > nesting',
	accept: [
		{ config: [true, { nesting: {} }] },
		{ config: [true, { nesting: {
			element: ['block'],
			blockModifier: [],
			blockModifierValue: ['blockModifier'],
			elementModifier: [{ parent: 'element', when: 'exists' }],
			elementModifierValue: [
				{ parent: 'elementModifier', when: ['exists', 'shared'] },
				{ parent: 'element', when: 'shared' },
				'block',
			],
		} }] },
	],
	reject: [
		{ config: [true, { nesting: 'strict' }] },
		{ config: [true, { nesting: false }] },
		{ config: [true, { nesting: { element: false } }] },
		{ config: [true, { nesting: { element: true } }] },
		{ config: [true, { nesting: { element: ['element'] } }] },
		{ config: [true, { nesting: { blockModifier: ['element'] } }] },
		{ config: [true, { nesting: { blockModifierValue: ['elementModifier'] } }] },
		{ config: [true, { nesting: { elementModifier: ['blockModifier'] } }] },
		{ config: [true, { nesting: { elementModifierValue: ['blockModifierValue'] } }] },
		{ config: [true, { nesting: { element: ['root'] } }] },
		{ config: [true, { nesting: { element: [{ parent: 'block', when: [] }] } }] },
		{ config: [true, { nesting: { element: [{ parent: 'block', when: 'always' }] } }] },
		{ config: [true, { nesting: { element: [{ parent: 'block', when: 'exists', extra: true }] } }] },
		{ config: [true, { nesting: { element: ['block', { parent: 'block', when: 'exists' }] } }] },
		{ config: [true, { nesting: { localExtension: [] } }] },
	],
});

testRuleConfig({
	description: 'Secondary option > ignore',
	accept: [
		{ config: [true, { ignore: [] }] },
		{ config: [true, { ignore: ['.block__title', '.vendor-*', /--active$/] }] },
	],
	reject: [{ config: [true, { ignore: '.block' }] }, { config: [true, { ignore: [1] }] }],
});

testRuleConfig({
	description: 'Primary option',
	accept: [
		{ description: 'Enabled rule', config: true },
		{ description: 'Skipped rule', config: null },
	],
	reject: [
		{ config: false },
		{ config: 'always' },
	],
});

testRuleConfig({
	description: 'Secondary options object',
	accept: [
		{ description: 'No value', config: [true] },
		{ description: 'Empty object', config: [true, {}] },
	],
	reject: [
		{ description: 'Secondary is not an object', config: [true, 'always'] },
	],
});

testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			config: [true, {
				messages: {
					detached: () => '',
				},
			}],
		},
	],
	reject: [
		{
			config: [true, {
				messages: {
					detached: 1,
				},
			}],
		},
		{
			config: [true, {
				messages: {
					unknown: () => '',
				},
			}],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > separators',
	accept: [
		{
			config: [true, {
				separators: {
					element: '__',
					modifier: '--',
					modifierValue: '--',
				},
			}],
		},
	],
	reject: [
		{
			config: [true, {
				separators: {
					element: 1,
				},
			}],
		},
		{
			config: [true, {
				separators: {
					unknown: '__',
				},
			}],
		},
	],
});
