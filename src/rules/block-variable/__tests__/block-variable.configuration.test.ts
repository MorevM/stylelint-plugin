import rule from '../block-variable';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

testRuleConfig({
	description: 'Primary option',
	accept: [
		{
			description: 'Enabled rule',
			config: true,
		},
		{
			description: 'Skipped rule',
			config: null,
		},
	],
	reject: [
		{ config: 'never' },
		{ config: false },
		{ config: ['false'] },
	],
});

testRuleConfig({
	description: 'Secondary options',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
	],
	reject: [
		{
			description: 'Unknown option',
			config: [true, { foo: 'bar' }],
		},
		{
			description: 'Not an object option',
			config: [true, 'always'],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > name',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'String option',
			config: [true, { name: 'block' }],
		},
	],
	reject: [
		{
			description: 'Array option',
			config: [true, { name: ['b', 'block'] }],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > interpolation',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'String option from the list (#1)',
			config: [true, { interpolation: 'always' }],
		},
		{
			description: 'String option from the list (#2)',
			config: [true, { interpolation: 'never' }],
		},
		{
			description: 'String option from the list (#2)',
			config: [true, { interpolation: 'ignore' }],
		},
	],
	reject: [
		{
			description: 'Unknown keyword',
			config: [true, { interpolation: 'foo' }],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > firstChild',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Enabled option',
			config: [true, { firstChild: true }],
		},
		{
			description: 'Disabled option',
			config: [true, { firstChild: false }],
		},
	],
	reject: [
		{
			description: 'String option',
			config: [true, { firstChild: 'always' }],
		},
	],
});


testRuleConfig({
	description: 'Secondary option > replaceBlockName',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Enabled option',
			config: [true, { replaceBlockName: true }],
		},
		{
			description: 'Disabled option',
			config: [true, { replaceBlockName: false }],
		},
	],
	reject: [
		{
			description: 'String option',
			config: [true, { replaceBlockName: 'always' }],
		},
	],
});
