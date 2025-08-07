import rule from '../match-file-name';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

// Primary option
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


// Secondary options object
testRuleConfig({
	description: 'Secondary options object',
	accept: [
		{
			description: 'Empty object (all defaults)',
			config: [true, {}],
		},
		{
			description: 'No value',
			config: [true],
		},
	],
	reject: [
		{
			description: 'Unknown option',
			config: [true, { foo: 'bar' }],
		},
		{
			description: 'Secondary is not an object',
			config: [true, 'always'],
		},
	],
});

// Secondary option > caseSensitive
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

// Secondary option > matchDirectory
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

// Secondary option > messages
testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			description: 'Valid messages object (arguments and return value are not checked)',
			config: [true, {
				messages: {
					match: () => '',
					matchCase: () => '',
				},
			}],
		},
	],
	reject: [
		{
			description: 'Non-valid `messages[prop]`',
			config: [true, {
				messages: {
					match: 1,
				},
			}],
		},
		{
			description: 'Extra `messages` key',
			config: [true, {
				messages: {
					match: () => '',
					matchCase: () => '',
					FOO: () => '',
				},
			}],
		},
	],
});
