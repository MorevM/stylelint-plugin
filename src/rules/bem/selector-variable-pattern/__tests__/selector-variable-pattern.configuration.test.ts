import rule from '../selector-variable-pattern';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

testRuleConfig({
	description: 'Primary option',
	accept: [
		{ description: 'Enables the rule', config: true },
		{ description: 'Disables the rule', config: null },
	],
	reject: [
		{ description: 'Rejects false', config: false },
		{ description: 'Rejects a string', config: 'always' },
	],
});

testRuleConfig({
	description: '`resolve` option',
	accept: [
		{ description: 'Accepts an omitted secondary object', config: [true] },
		{ description: 'Accepts an omitted resolver', config: [true, {}] },
		{
			description: 'Accepts a resolver',
			config: [true, { resolve: () => 'item' }],
		},
	],
	reject: [
		{ description: 'Rejects a non-function resolver', config: [true, { resolve: 'item' }] },
		{
			description: 'Rejects an unknown secondary option',
			config: [true, { unknown: true }],
		},
	],
});

testRuleConfig({
	description: '`separators` option',
	accept: [
		{
			description: 'Accepts custom separators',
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
			description: 'Rejects a non-string separator',
			config: [true, { separators: { element: 1 } }],
		},
	],
});

testRuleConfig({
	description: '`messages` option',
	accept: [
		{
			description: 'Accepts a valid custom message',
			config: [true, {
				messages: {
					invalidName: () => '',
				},
			}],
		},
	],
	reject: [
		{
			description: 'Rejects a non-function message',
			config: [true, {
				messages: { invalidName: 'message' },
			}],
		},
		{
			description: 'Rejects an unknown message',
			config: [true, {
				messages: { unknown: () => '' },
			}],
		},
	],
});
