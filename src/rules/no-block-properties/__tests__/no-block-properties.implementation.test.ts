import rule from '../no-block-properties';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'No disallowed properties in the component block or its modifiers',
			code: `
				.the-component { color: red; }
				.the-component--modifier { color: red; }
				.the-component--modifier--value { color: red; }
			`,
		},
		{
			description: 'Disallowed property in element or its modifier',
			code: `
				.the-component__element { margin-block-start: 16px; }
				.the-component__element--modifier { margin-block-start: 16px; }
			`,
		},
		{
			description: 'Disallowed property in a side-effect',
			code: `
				.the-component a { margin-block-start: 16px; }
				.the-component .another-component { margin-block-start: 16px; }
			`,
		},
		{
			description: 'Side effect applied to its own modifier or element',
			code: `
				.the-component .the-component__element { margin-block-start: 16px; }
				.the-component .the-component--modifier { margin-block-start: 16px; }
			`,
		},
		{
			description: 'Disallowed property in a side-effect using nesting',
			code: `
				.the-component {
					a { margin-block-start: 16px; }
					.another-component { margin-block-start: 16px; }
				}
			`,
		},
		{
			description: 'Disallowed property in pseudo-element',
			code: `
				.the-component::before { margin-block-start: 16px; }
				.the-component--modifier::before { margin-block-start: 16px; }
			`,
		},
	],
	reject: [
		{
			description: 'Block has a disallowed property',
			code: `
				.the-component { margin-block-start: 16px; }
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component', 'block', 'EXTERNAL_GEOMETRY'),
					line: 1, column: 18,
					endLine: 1, endColumn: 36,
				},
			],
		},
		{
			description: 'Multiple blocks have a disallowed property using compound selector',
			code: `
				.foo, .foo.is-active, .foo--modifier, .foo--modifier.utility {
					margin-block-start: 16px;
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.foo', 'block', 'EXTERNAL_GEOMETRY'),
					line: 2, column: 2,
					endLine: 2, endColumn: 20,
				},
				{
					message: messages.unexpected('margin-block-start', '.foo.is-active', 'utility', 'EXTERNAL_GEOMETRY'),
					line: 2, column: 2,
					endLine: 2, endColumn: 20,
				},
				{
					message: messages.unexpected('margin-block-start', '.foo--modifier', 'modifier', 'EXTERNAL_GEOMETRY'),
					line: 2, column: 2,
					endLine: 2, endColumn: 20,
				},
				{
					message: messages.unexpected('margin-block-start', '.foo--modifier.utility', 'utility', 'EXTERNAL_GEOMETRY'),
					line: 2, column: 2,
					endLine: 2, endColumn: 20,
				},
			],
		},
		{
			description: 'One of compound selectors has a disallowed property',
			code: `
				.the-component, .foo__element { margin-block-start: 16px; }
				.the-component__element, .foo { margin-block-start: 16px; }
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component', 'block', 'EXTERNAL_GEOMETRY'),
					line: 1, column: 33,
					endLine: 1, endColumn: 51,
				},
				{
					message: messages.unexpected('margin-block-start', '.foo', 'block', 'EXTERNAL_GEOMETRY'),
					line: 2, column: 33,
					endLine: 2, endColumn: 51,
				},
			],
		},
		{
			description: 'Block modifier has disallowed property',
			code: `
				.the-component {
					&--modifier {
						margin-block-start: 16px;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component--modifier', 'modifier', 'EXTERNAL_GEOMETRY'),
					line: 3, column: 3,
					endLine: 3, endColumn: 21,
				},
			],
		},
		{
			description: 'Block modifier nested inside another selector with disallowed property',
			code: `
				.the-component {
					&--modifier.is-active {
						margin-block-start: 16px;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component--modifier.is-active', 'utility', 'EXTERNAL_GEOMETRY'),
					line: 3, column: 3,
					endLine: 3, endColumn: 21,
				},
			],
		},
		{
			description: 'Block modifier has an external geometry property inside pseudo-class O_o',
			code: `
				.the-component {
					&:hover {
						margin-block-start: 16px;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component', 'block', 'EXTERNAL_GEOMETRY'),
					line: 3, column: 3,
					endLine: 3, endColumn: 21,
				},
			],
		},
	],
});

testRule({
	description: '`ignoreBlocks` option',
	config: [true, { ignoreBlocks: ['swiper-*', /.*legacy.*/] }],
	accept: [
		{
			description: 'Does not report ignored blocks',
			code: `
				.swiper-slide { margin-block-start: 16px; }
				.foo-legacy-component { margin-block-start: 16px; }
				.legacy-component { margin-block-start: 16px; }
			`,
		},
	],
	reject: [
		{
			description: 'Still reports non-ignored ones',
			code: `
				.the-component { margin-block-start: 16px; }
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start', '.the-component', 'block', 'EXTERNAL_GEOMETRY'),
					line: 1, column: 18,
					endLine: 1, endColumn: 36,
				},
			],
		},
	],
});

testRule({
	description: '`messages` option',
	config: [true, {
		presets: ['FOO', 'EXTERNAL_GEOMETRY'],
		customPresets: {
			FOO: ['color'],
		},
		disallowProperties: ['width'],
		messages: {
			unexpected: (property: string, selector: string, context: string, preset: string | undefined) =>
				[property, selector, context, preset].filter(Boolean).join(':'),
		},
	}],
	reject: [
		{
			description: 'Reports with user-defined message',
			code: `
				.the-component { margin-block-start: 16px; }
				.the-component.is-active { color: red; }
				.the-component--modifier { width: 16px; }
			`,
			warnings: [
				{
					message: 'margin-block-start:.the-component:block:EXTERNAL_GEOMETRY',
					line: 1, column: 18,
					endLine: 1, endColumn: 36,
				},
				{
					message: 'color:.the-component.is-active:utility:FOO',
					line: 2, column: 28,
					endLine: 2, endColumn: 33,
				},
				{
					message: 'width:.the-component--modifier:modifier',
					line: 3, column: 28,
					endLine: 3, endColumn: 33,
				},
			],
		},
	],
});
