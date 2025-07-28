import rule from '../no-chained-entities';

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
		{ config: false },
		{ config: 'never' },
		{ config: ['false'] },
	],
});

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

testRuleConfig({
	description: 'Secondary option > disallowNestedModifierValues',
	accept: [
		{
			description: 'Enabled option',
			config: [true, {
				disallowNestedModifierValues: true,
			}],
		},
		{
			description: 'Disabled option',
			config: [true, {
				disallowNestedModifierValues: false,
			}],
		},
	],
	reject: [
		{
			description: 'Non-valid option type',
			config: [true, {
				disallowNestedModifierValues: 1,
			}],
		},
	],
});

testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			description: 'Valid messages object',
			config: [true, {
				messages: {
					block: () => '',
					element: () => '',
					modifierName: () => '',
					modifierValue: () => '',
					nestedModifierValue: () => '',
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
					block: () => '',
					FOO: () => '',
				},
			}],
		},
	],
});
