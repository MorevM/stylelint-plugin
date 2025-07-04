import rule from './no-splitted-entities';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

// Default options
testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'Ignores CSS files',
			codeFilename: 'the-component.css',
			code: `
				.the-component {
					&__key {
						&-value {}
					}
				}
			`,
		},
		{
			description: 'Nesting does not break BEM entities',
			code: `
				.the-component {
					&__element {
						&--element-modifier {}
						&--theme--light {}
						&--theme-variant--dark {}
					}

					&--block-modifier {
						&--modifier-value {}
					}

					&--block-modifier--modifier-value {}
				}
			`,
		},
		{
			description: 'Does not report not BEM-related content',
			code: `
				.the-component {
					&.is-disabled {}
					&[disabled] {}
					&#{foo} {}
				}
			`,
		},
		{
			description: 'Does not report prefixed not splitted entities',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						#{$b}--foo &,
						#{$b}--bar & {}
					}
				}
			`,
		},
		{
			description: 'Does not report combinators',
			code: `
				.the-component {
					&__element {
						& ~ #{$inner} {}
						& > * {}
						& + & {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Splitted element selector (simple case)',
			code: `
				.the-component {
					&__element {
						&-title {}
						&-value {
							&--modifier {
								&-one {}
								&-two {}
							}
						}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.split('&-title'),
				},
				{
					line: 4, column: 3,
					endLine: 4, endColumn: 10,
					message: messages.split('&-value'),
				},
				{
					line: 6, column: 5,
					endLine: 6, endColumn: 10,
					message: messages.split('&-one'),
				},
				{
					line: 7, column: 5,
					endLine: 7, endColumn: 10,
					message: messages.split('&-two'),
				},
			],
		},
		{
			description: 'Splitted element selector (with global element prepended)',
			code: `
				.the-component {
					&__element {
						.another-component
						&-title {}
					}
				}
			`,
			warnings: [
				{
					line: 4, column: 3,
					endLine: 4, endColumn: 10,
					message: messages.split('&-title'),
				},
			],
		},
		{
			description: 'Splitted element selector (within media queries)',
			code: `
				.the-component {
					@media (min-width: 320px) {
						&__element {
							&-title {}
							&-value {
								&--modifier {
									@media (min-width: 320px) {
										&-one {}
									}
									&-two {}
								}
							}
						}
					}
				}
			`,
			warnings: [
				{
					line: 4, column: 4,
					endLine: 4, endColumn: 11,
					message: messages.split('&-title'),
				},
				{
					line: 5, column: 4,
					endLine: 5, endColumn: 11,
					message: messages.split('&-value'),
				},
				{
					line: 8, column: 7,
					endLine: 8, endColumn: 12,
					message: messages.split('&-one'),
				},
				{
					line: 10, column: 6,
					endLine: 10, endColumn: 11,
					message: messages.split('&-two'),
				},
			],
		},
	],
});

// TODO: Non-default options
