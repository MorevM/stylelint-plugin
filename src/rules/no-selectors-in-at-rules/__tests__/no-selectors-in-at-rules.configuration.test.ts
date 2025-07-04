import rule from '../no-selectors-in-at-rules';

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
