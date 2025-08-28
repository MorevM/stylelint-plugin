import rule from '../selector-pattern';

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
			description: 'Secondary is not an object',
			config: [true, 'always'],
		},
	],
});

// Secondary option > patterns
testRuleConfig({
	description: 'Secondary option > separators',
	accept: [
		{
			description: 'Valid pattern object (strings)',
			config: [true, {
				patterns: {
					block: 'KEBAB_CASE',
					element: 'KEBAB_CASE',
					modifierName: 'KEBAB_CASE',
					modifierValue: 'KEBAB_CASE',
				},
			}],
		},
		{
			description: 'Valid pattern object (regexes)',
			config: [true, {
				patterns: {
					block: /^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/,
					element: /^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/,
					modifierName: /^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/,
					modifierValue: /^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/,
				},
			}],
		},
		{
			description: 'Valid pattern object (mixed type)',
			config: [true, {
				patterns: {
					block: [/^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/, 'foo-*'],
				},
			}],
		},
		{
			description: 'Valid pattern object (modifier value as `false`)',
			config: [true, {
				patterns: {
					modifierValue: false,
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

// Secondary option > messages
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
