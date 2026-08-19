import rule from '../no-grouped-entities';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

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
	description: 'Secondary option > strict',
	accept: [
		{
			description: 'Single-owner behavior',
			config: [true, { strict: false }],
		},
		{
			description: 'Strict behavior',
			config: [true, { strict: true }],
		},
	],
	reject: [
		{
			description: 'Non-boolean value',
			config: [true, { strict: 'always' }],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			config: [true, {
				messages: {
					grouped: () => '',
					redeclared: () => '',
				},
			}],
		},
	],
	reject: [
		{
			config: [true, {
				messages: {
					grouped: 1,
				},
			}],
		},
		{
			config: [true, {
				messages: {
					redeclared: 1,
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
