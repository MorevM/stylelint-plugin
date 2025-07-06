import rule from '../match-file-name';

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
	description: 'Secondary option > caseSensitive',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Option `true`',
			config: [true, { caseSensitive: true }],
		},
		{
			description: 'Option `false`',
			config: [true, { caseSensitive: false }],
		},
	],
	reject: [
		{
			description: 'Unknown option type',
			config: [true, { caseSensitive: 'yes' }],
		},
		{
			description: 'Unknown additional option',
			config: [true, { caseSensitive: true, foo: 'bar' }],
		},
	],
});


testRuleConfig({
	description: 'Secondary option > matchDirectory',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Option `true`',
			config: [true, { matchDirectory: true }],
		},
		{
			description: 'Option `false`',
			config: [true, { matchDirectory: false }],
		},
	],
	reject: [
		{
			description: 'Unknown option type',
			config: [true, { matchDirectory: 'yes' }],
		},
		{
			description: 'Unknown additional option',
			config: [true, { matchDirectory: true, foo: 'bar' }],
		},
	],
});
