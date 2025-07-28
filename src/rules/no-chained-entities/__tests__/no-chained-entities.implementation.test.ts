import rule from '../no-chained-entities';

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
						&:hover {}
						&::before {}
						&#id {}
						&[data-attribute] {}

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
					&:hover {}
					&::before {}
					&.is-disabled {}
					&[disabled] {}
					&#{$foo} {}
				}
			`,
		},
		{
			description: 'Does not report interpolated strings',
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
						& > & {}
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
						&-title, &-value {
							&--modifier {
								&-one, &-one-two {}
								&-two {}
							}
						}
					}

					&-name, &--modifier {}
				}
			`,
			warnings: [
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.element('&__element-title'),
				},
				{
					line: 3, column: 12,
					endLine: 3, endColumn: 19,
					message: messages.element('&__element-value'),
				},
				{
					line: 5, column: 5,
					endLine: 5, endColumn: 10,
					message: messages.modifierName('&--modifier-one'),
				},
				{
					line: 5, column: 12,
					endLine: 5, endColumn: 21,
					message: messages.modifierName('&--modifier-one-two'),
				},
				{
					line: 6, column: 5,
					endLine: 6, endColumn: 10,
					message: messages.modifierName('&--modifier-two'),
				},
				{
					line: 11, column: 2,
					endLine: 11, endColumn: 8,
					message: messages.block('.the-component-name'),
				},
			],
		},
		{
			description: 'Splitted element selector (with global element prepended)',
			code: `
				.the-component {
					&__element {
						.another-component &-title {}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 22,
					endLine: 3, endColumn: 29,
					message: messages.element('&__element-title'),
				},
			],
		},
		{
			description: 'Splitted element selector (withthin compound selector)',
			code: `
				.the-component {
					&__element {
						.another-component, &-title {}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 23,
					endLine: 3, endColumn: 30,
					message: messages.element('&__element-title'),
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
					message: messages.element('&__element-title'),
				},
				{
					line: 5, column: 4,
					endLine: 5, endColumn: 11,
					message: messages.element('&__element-value'),
				},
				{
					line: 8, column: 7,
					endLine: 8, endColumn: 12,
					message: messages.modifierName('&--modifier-one'),
				},
				{
					line: 10, column: 6,
					endLine: 10, endColumn: 11,
					message: messages.modifierName('&--modifier-two'),
				},
			],
		},
		{
			description: 'Splitted elements with mixed entities across different blocks',
			code: `
				.the-component {
					&__element, .foo {
						&-title {}
						&--bar {
							&-baz {}
						}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.element('&__element-title'),
				},
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.block('.foo-title'),
				},
				{
					line: 5, column: 4,
					endLine: 5, endColumn: 9,
					message: messages.modifierName('&--bar-baz'),
				},
			],
		},
		{
			description: 'Mixed entities in one rule',
			code: `
				.the-component {
					&__element, &--modifier {
						&-value {}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.element('&__element-value'),
				},
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.modifierName('&--modifier-value'),
				},
			],
		},
		{
			description: 'Rules inside `@at-root` or `@nest`',
			code: `
				.the-component {
					&__element, &--modifier {
						&-value {
							@at-root .foo {
								&-block {
									&__el {
										@nest &-val {}
									}
								}
							}
						}
					}
				}
			`,
			warnings: [
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.element('&__element-value'),
				},
				{
					line: 3, column: 3,
					endLine: 3, endColumn: 10,
					message: messages.modifierName('&--modifier-value'),
				},
				{
					line: 5, column: 5,
					endLine: 5, endColumn: 12,
					message: messages.block('.foo-block'),
				},
				{
					line: 7, column: 13,
					endLine: 7, endColumn: 18,
					message: messages.element('&__el-val'),
				},
			],
		},
	],
});

// disallowNestedModifierValues: true
testRule({
	description: 'Secondary > disallowNestedModifierValues: true',
	config: [true, { disallowNestedModifierValues: true }],
	reject: [
		{
			code: `
				.block {
					&__element {
						&--modifier {
							@media (width > 360px) {
								@layer components {
									&--value {
										&value {}
									}
								}
							}
						}
					}

					&--modifier--value {}
				}
			`,
			warnings: [
				{
					message: messages.nestedModifierValue('&--modifier--value'),
					line: 6, column: 9,
					endLine: 6, endColumn: 14,
				},
				{
					message: messages.nestedModifierValue('&--modifier--valuevalue'),
					line: 7, column: 7,
					endLine: 7, endColumn: 13,
				},
			],
		},
	],
});

// `messages` option with allowed modifier values
testRule({
	description: '`messages` option with allowed modifier values',
	config: [true, {
		messages: {
			block: (expected: string) => `Block ${expected}`,
			element: (expected: string) => `Element ${expected}`,
			modifierName: (expected: string) => `Modifier name ${expected}`,
			modifierValue: (expected: string) => `Modifier value ${expected}`,
			nestedModifierValue: (expected: string) => `Nested ${expected}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.foo {
					&-b {
						&__el {
							&-e {
								&--mod {
									&-m {
										&--value {
											&-v {}
										}
									}
								}
							}
						}
					}
				}
			`,
			warnings: [
				{ message: `Block .foo-b` },
				{ message: `Element &__el-e` },
				{ message: `Modifier name &--mod-m` },
				{ message: `Modifier value &--value-v` },
			],
		},
	],
});

// `messages` option with disallowed modifier values
testRule({
	description: '`messages` option with disallowed modifier values',
	config: [true, {
		disallowNestedModifierValues: true,
		messages: {
			block: (expected: string) => `Block ${expected}`,
			element: (expected: string) => `Element ${expected}`,
			modifierName: (expected: string) => `Modifier name ${expected}`,
			modifierValue: (expected: string) => `Modifier value ${expected}`,
			nestedModifierValue: (expected: string) => `Nested ${expected}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.foo {
					&-b {}
					&--mod {
						&--value {}
					}

					&--mod2 {
						&--value2 {
							&-value3 {}
						}
					}
				}
			`,
			warnings: [
				{ message: `Block .foo-b` },
				{ message: `Nested &--mod--value` },
				{ message: `Nested &--mod2--value2` },
				{ message: `Nested &--mod2--value2-value3` },
			],
		},
	],
});
