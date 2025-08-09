import rule from '../no-side-effects';

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
		{ config: false },
		{ config: 'never' },
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

// Secondary option > ignore
testRuleConfig({
	description: 'Secondary option > ignore',
	accept: [
		{
			description: 'Empty array',
			config: [true, { ignore: [] }],
		},
		{
			description: 'String pattern',
			config: [true, { ignore: ['b'] }],
		},
		{
			description: 'String pattern with wildcard',
			config: [true, { ignore: ['-*'] }],
		},
		{
			description: 'RegExp pattern',
			config: [true, { ignore: [/.*foo.*/] }],
		},
		{
			description: 'Mixed types',
			config: [true, { ignore: ['-*', /.*foo.*/] }],
		},
	],
	reject: [
		{
			description: 'ignore is not an array',
			config: [true, { ignore: 'b' }],
		},
		{
			description: 'ignore array contains invalid type',
			config: [true, { ignore: ['b', 123] }],
		},
	],
});

// Secondary option > messages
testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			description: 'Valid messages object',
			config: [true, {
				messages: {
					rejected: () => '',
				},
			}],
		},
	],
	reject: [
		{
			description: 'Non-valid `messages[prop]`',
			config: [true, {
				messages: {
					rejected: 1,
				},
			}],
		},
		{
			description: 'Extra `messages` key',
			config: [true, {
				messages: {
					rejected: () => '',
					FOO: () => '',
				},
			}],
		},
	],
});
