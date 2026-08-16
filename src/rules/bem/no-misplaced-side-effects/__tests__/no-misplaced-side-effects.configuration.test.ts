import rule from '../no-misplaced-side-effects';

const { ruleName } = rule;
const testRuleConfig = createTestRuleConfig({ ruleName });

testRuleConfig({
	description: 'Primary option',
	accept: [
		{ description: 'Enabled rule', config: true },
		{ description: 'Skipped rule', config: null },
	],
	reject: [
		{ config: false },
		{ config: 'always' },
	],
});

testRuleConfig({
	description: 'Secondary options object',
	accept: [
		{ description: 'No value', config: [true] },
		{ description: 'Empty object', config: [true, {}] },
	],
	reject: [
		{ description: 'Secondary is not an object', config: [true, 'always'] },
	],
});

testRuleConfig({
	description: 'Secondary option > messages',
	accept: [
		{
			config: [true, {
				messages: {
					misplaced: () => '',
				},
			}],
		},
	],
	reject: [
		{
			config: [true, {
				messages: {
					misplaced: 1,
				},
			}],
		},
		{
			config: [true, {
				messages: {
					unknown: () => '',
				},
			}],
		},
	],
});
