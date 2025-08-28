import rule from '../no-selectors-in-at-rules';

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
			description: 'Secondary is not an object',
			config: [true, 'always'],
		},
	],
});

// Secondary option > ignore
testRuleConfig({
	description: 'Secondary option',
	accept: [
		{
			description: 'Empty object',
			config: [true, {
				ignore: {},
			}],
		},
		{
			description: 'As a string',
			config: [true, {
				ignore: {
					media: 'print',
				},
			}],
		},
		{
			description: 'As an array of strings',
			config: [true, {
				ignore: {
					media: ['print', '/width >= 480px/'],
				},
			}],
		},
		{
			description: 'As a RegExp',
			config: [true, {
				ignore: {
					layer: /.+/,
				},
			}],
		},
	],
	reject: [
		{
			description: 'Not an object',
			config: [true, {
				ignore: '',
			}],
		},
		{
			description: 'Invalid property value',
			config: [true, {
				ignore: {
					media: false,
				},
			}],
		},
		{
			description: 'Invalid property value',
			config: [true, {
				ignore: {
					media: ['false', false],
				},
			}],
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
					unexpected: () => '',
				},
			}],
		},
	],
	reject: [
		{
			description: 'Non-valid `messages[prop]`',
			config: [true, {
				messages: {
					unexpected: 1,
				},
			}],
		},
		{
			description: 'Extra `messages` key',
			config: [true, {
				messages: {
					unexpected: () => '',
					FOO: () => '',
				},
			}],
		},
	],
});
