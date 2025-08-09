import rule from '../match-file-name';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

// Default options
testRule({
	description: 'Default options',
	config: [true],
	codeFilename: '/the-component/the-component.scss',
	accept: [
		{
			description: 'Does not report if there is no BEM block',
			code: `
				#block {}
			`,
		},
		{
			description: 'Does not report if there is no information about file name',
			codeFilename: undefined,
			code: `
				.the-component {}
			`,
		},
		{
			description: 'The block declaration strictly matches the file name',
			code: `
				.the-component {}
			`,
		},
		{
			description: 'The file name just starts with the block name',
			codeFilename: 'the-component.style.scss',
			code: `
				.the-component {}
			`,
		},
		{
			description: 'The block declaration strictly matches the file name using PascalCase',
			codeFilename: 'TheComponent.scss',
			code: `
				.TheComponent {}
			`,
		},
		{
			description: 'The block declaration strictly matches the file name using camelCase',
			codeFilename: 'theComponent.scss',
			code: `
				.theComponent {}
			`,
		},
	],
	reject: [
		{
			description: 'The block name does not match the file name',
			code: `
				.foo-component {}
			`,
			message: messages.match('file', 'foo-component'),
		},
		{
			description: 'The block name matches the filename, but not its case',
			code: `
				.TheComponent {}
			`,
			message: messages.matchCase('file', 'TheComponent'),
		},
	],
});

// Case insensitive mode, file name in PascalCase
testRule({
	description: 'Case insensitive mode, file name in PascalCase',
	config: [true, { caseSensitive: false }],
	codeFilename: '/the-component/TheComponent.styles.scss',
	accept: [
		{
			description: 'The component name matches the file name using kebabCase',
			code: `
				.theComponent {}
			`,
		},
		{
			description: 'The component name matches the file name using snake_case',
			code: `
				.the_component {}
			`,
		},
		{
			description: 'The component name matches the file name using PascalCase',
			code: `
				.TheComponent {}
			`,
		},
		{
			description: 'The component name matches the file name using kebab-case',
			code: `
				.the-component {}
			`,
		},
	],
	reject: [
		{
			description: 'File name does starts with block name, but in different case',
			code: `
				.foo-component {}
			`,
			warnings: [
				{
					message: messages.match('file', 'foo-component'),
				},
			],
		},
	],
});

// Case sensitive mode, matches directory name instead of file name
testRule({
	description: 'Case sensitive mode, matches directory name instead of file name',
	config: [true, { matchDirectory: true, caseSensitive: true }],
	codeFilename: '/the-component/index.styles.scss',
	accept: [
		{
			description: 'Directory name matches the block name',
			code: `
				.the-component {}
			`,
		},
	],
	reject: [
		{
			codeFilename: '/the-component/index.scss',
			description: 'Directory name matches the block name, but in different case',
			code: `
				.TheComponent {}
			`,
			warnings: [
				{
					message: messages.matchCase('directory', 'TheComponent'),
				},
			],
		},
		{
			codeFilename: '/the-component/index.scss',
			description: 'Directory name does not match the block name',
			code: `
				.foo-component {}
			`,
			warnings: [
				{
					message: messages.match('directory', 'foo-component'),
				},
			],
		},
	],
});

// Case insensitive mode, matches directory name instead of file name
testRule({
	description: 'Case insensitive mode, matches directory name instead of file name',
	config: [true, { matchDirectory: true, caseSensitive: false }],
	codeFilename: '/the-component/index.styles.scss',
	accept: [
		{
			description: 'Directory name matches the block name',
			code: `.the-component {}`,
		},
		{
			description: 'Directory name matches the block name, but case is different',
			code: `.TheComponent {}`,
		},
		{
			codeFilename: '/TheComponent/index.scss',
			description: 'Directory name matches the block name, but case is different',
			code: `.the-component {}`,
		},
	],
	reject: [
		{
			codeFilename: '/the-component/index.scss',
			description: 'Directory name does not match the block name',
			code: `
				.foo-component {}
			`,
			warnings: [
				{
					message: messages.match('directory', 'foo-component'),
				},
			],
		},
	],
});

// `messages` option
testRule({
	description: '`messages` option',
	config: [true, {
		messages: {
			match: (entity: string, blockName: string) => `Match ${entity} ${blockName}`,
			matchCase: (entity: string, blockName: string) => `Match case ${entity} ${blockName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided (match)',
			codeFilename: 'foo-component.scss',
			code: `
				.the-component {}
			`,
			warnings: [
				{ message: `Match file the-component` },
			],
		},
		{
			description: 'Uses custom messages if provided (matchCase)',
			codeFilename: 'the-component.scss',
			code: `
				.TheComponent {}
			`,
			warnings: [
				{ message: `Match case file TheComponent` },
			],
		},
	],
});
