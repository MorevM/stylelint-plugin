import rule from '../no-block-properties';

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

// Secondary option > messages
testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			description: 'Valid messages object (arguments and return value are not checked)',
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
					block: 1,
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

// Secondary option > separators
testRuleConfig({
	description: 'Secondary option > separators',
	accept: [
		{
			description: 'Valid separators object',
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
			description: 'Non-valid `separators[prop]`',
			config: [true, {
				separators: {
					element: 1,
				},
			}],
		},
		{
			description: 'Extra `separators` key',
			config: [true, {
				separators: {
					FOO: '__',
				},
			}],
		},
	],
});
