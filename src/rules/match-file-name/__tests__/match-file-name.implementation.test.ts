import rule from '../match-file-name';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

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
			message: messages.match('foo-component'),
		},
		{
			description: 'The block name matches the filename, but not its case',
			code: `
				.TheComponent {}
			`,
			message: messages.matchCase('TheComponent'),
		},
	],
});

testRule({
	description: 'Non-strict mode, file name in PascalCase',
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
					message: messages.match('foo-component'),
				},
			],
		},
	],
});
