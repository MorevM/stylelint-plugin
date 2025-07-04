import rule from './no-side-effects';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'CSS file',
	codeFilename: 'the-component.css',
	config: [true],
	accept: [
		{
			description: 'Do not report CSS file without side-effects',
			code: `
				.the-component {}
				.the-component::before {}
				.the-component__element {}
				.the-component--modifier:hover {}
				.the-component__element .the-component .the-component__foo {}
				button.the-component__element {}
			`,
		},
	],
	reject: [
		{
			description: 'Report side-effect on the root level',
			code: `
				.the-component {}
				.another-component {}
			`,
			warnings: [
				{
					message: messages.rejected('.another-component'),
					line: 2, column: 1,
					endLine: 2, endColumn: 19,
				},
			],
		},
		{
			description: 'Report inline side-effect',
			code: `
				.the-component {}
				.the-component a {}
			`,
			warnings: [
				{
					message: messages.rejected('a'),
					line: 2, column: 16,
					endLine: 2, endColumn: 17,
				},
			],
		},
		{
			description: 'Report side-effect using nesting',
			code: `
				.the-component {
					a {}
				}
			`,
			warnings: [
				{
					message: messages.rejected('a'),
					line: 2, column: 2,
					endLine: 2, endColumn: 3,
				},
			],
		},
		{
			description: 'Report only needed part of the selector',
			code: `
				.the-component {}
				.the-component__element .another-one {}
			`,
			warnings: [
				{
					message: messages.rejected('.another-one'),
					line: 2, column: 25,
					endLine: 2, endColumn: 37,
				},
			],
		},
		{
			description: 'Report complex selector',
			code: `
				.the-component {}
				.the-component__element table.another-one {}
			`,
			warnings: [
				{
					message: messages.rejected('table.another-one'),
					line: 2, column: 25,
					endLine: 2, endColumn: 42,
				},
			],
		},
		{
			description: 'Reports right range',
			code: `
				.the-component {}
				.the-component component {}
			`,
			warnings: [
				{
					message: messages.rejected('component'),
					line: 2, column: 16,
					endLine: 2, endColumn: 25,
				},
			],
		},
		{
			description: 'Reports in case of multiple selectors',
			code: `
				.the-component {}
				.the-component__element, .the-component table {}
			`,
			warnings: [
				{
					message: messages.rejected('table'),
					line: 2, column: 41,
					endLine: 2, endColumn: 46,
				},
			],
		},
	],
});

testRule({
	config: [true],
	accept: [
		{
			description: 'The empty component',
			code: `.the-component {}`,
		},
		{
			description: 'Component with nested declarations written in BEM',
			code: `
				.the-component {
					&__element {
						&--modifier {
							color: red;
						}
					}

					@at-root .the-component--modifier {
						color: red;
					}
				}
			`,
		},
		{
			description: 'Component with some interpolated class',
			code: `
				.the-component {
					$b: #{&};

					#{$b} {}
				}
			`,
		},
		{
			description: 'Component with media query affecting only itself on the root level',
			code: `
				.the-component {}

				@media (min-width: 320px) {
					.the-component {}
				}
			`,
		},
		{
			description: 'Component with states not written in BEM',
			code: `
				.the-component {
					&.is-active {}
					&__element.is-active {}
					&[disabled] {}
				}
			`,
		},
		{
			description: 'Does not check @keyframes',
			code: `
				.the-component {}

				@keyframes loader-rotation {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`,
		},
	],
	reject: [
		{
			description: 'Direct side-effect on the root level',
			code: `
				.the-component {}
				.another-component {}
			`,
			warnings: [
				{
					line: 2, column: 1,
					endLine: 2, endColumn: 19,
					message: messages.rejected('.another-component'),
				},
			],
		},
		{
			description: 'Side-effect via `@at-root` directive',
			code: `
				.the-component {
					@at-root .another-component {}
				}
			`,
			warnings: [
				{
					line: 2, column: 11,
					endLine: 2, endColumn: 29,
					message: messages.rejected('.another-component'),
				},
			],
		},
		{
			description: 'Side-effect within `@media`-query on the root level',
			code: `
				.the-component {}

				@media (max-width: 320px) {
					.another-component {}
				}
			`,
			warnings: [
				{
					line: 4, column: 2,
					endLine: 4, endColumn: 20,
					message: messages.rejected('.another-component'),
				},
			],
		},
		{
			description: 'Side-effect within `@media`-query within the declaration',
			code: `
				.the-component {
					@media (max-width: 320px) {
						@at-root .another-component {}
					}

					@media (max-width: 320px) {
						.foo-component {}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 12,
					endLine: 3, endColumn: 30,
					message: messages.rejected('.another-component'),
				},
				{
					line: 7, column: 3,
					endLine: 7, endColumn: 17,
					message: messages.rejected('.foo-component'),
				},
			],
		},
		{
			description: 'Side-effect for a tag, id, something with a pseudo-class',
			code: `
				.the-component {
					&__element tag {}
					&__element #element {}
					&__element .os-viewport:hover {}
				}
			`,
			warnings: [
				{
					line: 2, column: 13,
					endLine: 2, endColumn: 16,
					message: messages.rejected('tag'),
				},
				{
					line: 3, column: 13,
					endLine: 3, endColumn: 21,
					message: messages.rejected('#element'),
				},
				{
					line: 4, column: 13,
					endLine: 4, endColumn: 25,
					message: messages.rejected('.os-viewport'),
				},
			],
		},
		{
			description: 'Reports in case of multiple selectors',
			code: `
				.the-component {
					&__element,
					.foo-component,
					@at-root .bar-component {}
				}
			`,
			warnings: [
				{
					message: messages.rejected('.foo-component'),
					line: 3, column: 2,
					endLine: 3, endColumn: 16,
				},
				{
					message: messages.rejected('.bar-component'),
					line: 4, column: 11,
					endLine: 4, endColumn: 25,
				},
			],
		},
	],
});
