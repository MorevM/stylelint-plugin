import rule from '../pattern';

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
					utility: () => '',
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
					element: () => '',
					modifierName: () => '',
					modifierValue: () => '',
					utility: () => '',
					FOO: () => '',
				},
			}],
		},
	],
});
