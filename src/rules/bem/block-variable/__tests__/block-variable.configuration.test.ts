import rule from '../block-variable';

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

// Secondary option object
testRuleConfig({
	description: 'Secondary option object',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
	],
	reject: [
		{
			description: 'Not an object option',
			config: [true, 'always'],
		},
	],
});

// Secondary option > name
testRuleConfig({
	description: 'Secondary option > name',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'String option',
			config: [true, { name: 'block' }],
		},
	],
	reject: [
		{
			description: 'Array option',
			config: [true, { name: ['b', 'block'] }],
		},
	],
});

// Secondary option > interpolation
testRuleConfig({
	description: 'Secondary option > interpolation',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'String option from the list (#1)',
			config: [true, { interpolation: 'always' }],
		},
		{
			description: 'String option from the list (#2)',
			config: [true, { interpolation: 'never' }],
		},
		{
			description: 'String option from the list (#2)',
			config: [true, { interpolation: 'ignore' }],
		},
	],
	reject: [
		{
			description: 'Unknown keyword',
			config: [true, { interpolation: 'foo' }],
		},
	],
});

// Secondary option > firstChild
testRuleConfig({
	description: 'Secondary option > firstChild',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Enabled option',
			config: [true, { firstChild: true }],
		},
		{
			description: 'Disabled option',
			config: [true, { firstChild: false }],
		},
	],
	reject: [
		{
			description: 'String option',
			config: [true, { firstChild: 'always' }],
		},
	],
});

// Secondary option > replaceBlockName
testRuleConfig({
	description: 'Secondary option > replaceBlockName',
	accept: [
		{
			description: 'No property (has a default)',
			config: [true, {}],
		},
		{
			description: 'Enabled option',
			config: [true, { replaceBlockName: true }],
		},
		{
			description: 'Disabled option',
			config: [true, { replaceBlockName: false }],
		},
	],
	reject: [
		{
			description: 'String option',
			config: [true, { replaceBlockName: 'always' }],
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
					missingVariable: () => '',
					variableNotFirst: () => '',
					invalidVariableName: () => '',
					invalidVariableValue: () => '',
					duplicatedVariable: () => '',
					hardcodedBlockName: () => '',
				},
			}],
		},
	],
	reject: [
		{
			description: 'Non-valid `messages[prop]`',
			config: [true, {
				messages: {
					missingVariable: 1,
				},
			}],
		},
		{
			description: 'Extra `messages` key',
			config: [true, {
				messages: {
					FOO: () => '',
					missingVariable: () => '',
					variableNotFirst: () => '',
					invalidVariableName: () => '',
					invalidVariableValue: () => '',
					duplicatedVariable: () => '',
					hardcodedBlockName: () => '',
				},
			}],
		},
	],
});
