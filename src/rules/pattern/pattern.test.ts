import rule from './pattern';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'Produce no errors when all is fine',
			code: `
				.the-component {
					&__element {
						&--modifier {}
						&--theme--light {}
						&--theme {
							&--dark {
								&-darker {}
							}
						}
					}
					&__foo {
						&.is-active{
							&.has-siblings.js-foo {}
						}

						&--mod.has-siblings{
							&--value.-error {}
						}
					}

					&-inner {
						&__element, .foo-component__el--mod--value {}

						@media (width >= 768px) {
							&--modifier {}
						}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports blocks that do not follow the naming pattern',
			code: `
				.TheComponent {}
				.TheComponent {
					&__foo .AnotherComponent, &__bar {
						.BazComponent {}
					}
					@at-root .FooComponent & {}
					&--mod, .BarComponent__element & {}
				}
			`,
			warnings: [
				{
					message: messages.block('TheComponent'),
					line: 1, column: 2,
					endLine: 1, endColumn: 14,
				},
				{
					message: messages.block('TheComponent'),
					line: 2, column: 2,
					endLine: 2, endColumn: 14,
				},
				{
					message: messages.block('AnotherComponent'),
					line: 3, column: 10,
					endLine: 3, endColumn: 26,
				},
				{
					message: messages.block('BazComponent'),
					line: 4, column: 4,
					endLine: 4, endColumn: 16,
				},
				{
					message: messages.block('FooComponent'),
					line: 6, column: 12,
					endLine: 6, endColumn: 24,
				},
				{
					message: messages.block('BarComponent'),
					line: 7, column: 11,
					endLine: 7, endColumn: 23,
				},
			],
		},
		{
			description: 'Warns of an element written out of pattern',
			code: `
				.the-component {
					&__fooBar {}
					&__foo__bar {}
					&__FooBar {}
					&__foo {
						&Bar {}

						@media (width >= 768px) {
							&__bar {}
						}
					}
				}
			`,
			warnings: [
				{
					message: messages.element('fooBar'),
					line: 2, column: 5,
					endLine: 2, endColumn: 11,
				},
				{
					message: messages.element('foo__bar'),
					line: 3, column: 5,
					endLine: 3, endColumn: 13,
				},
				{
					message: messages.element('FooBar'),
					line: 4, column: 5,
					endLine: 4, endColumn: 11,
				},
				{
					message: messages.element('fooBar'),
					line: 6, column: 3,
					endLine: 6, endColumn: 7,
				},
				{
					message: messages.element('foo__bar'),
					line: 9, column: 4,
					endLine: 9, endColumn: 10,
				},
			],
		},
		{
			description: 'Warns of a modifier name written out of pattern',
			code: `
				.the-component {
					&__foo {
						&--modName {}
					}
				}
			`,
			warnings: [
				{
					message: messages.modifierName('modName'),
					line: 3, column: 6,
					endLine: 3, endColumn: 13,
				},
			],
		},
		{
			description: 'Warns of a modifier value written out of pattern',
			code: `
				.the-component {
					&__foo {
						&--mod-name {
							&--modValue {}
						}
					}
				}
			`,
			warnings: [
				{
					message: messages.modifierValue('modValue'),
					line: 4, column: 7,
					endLine: 4, endColumn: 15,
				},
			],
		},
		{
			description: 'Warns of an utility classes written out of pattern',
			code: `
				.the-component {
					&.foo {}
					&__foo {
						&.foo {}
						&--mod-name {
							&.foo {}
							&.foo.is-active.bar.js-baz {}
						}
					}
				}
			`,
			warnings: [
				{
					message: messages.utility('foo'),
					line: 2, column: 4,
					endLine: 2, endColumn: 7,
				},
				{
					message: messages.utility('foo'),
					line: 4, column: 5,
					endLine: 4, endColumn: 8,
				},
				{
					message: messages.utility('foo'),
					line: 6, column: 6,
					endLine: 6, endColumn: 9,
				},
				{
					message: messages.utility('foo'),
					line: 7, column: 6,
					endLine: 7, endColumn: 9,
				},
				{
					message: messages.utility('bar'),
					line: 7, column: 20,
					endLine: 7, endColumn: 23,
				},
			],
		},
		{
			description: 'Warns of an elements written out of pattern with compound selector',
			code: `
				.the-component {
					&__foo, &__fooBar {
						&--mod-name, &--MODNAME {
							&--mod-value,
							&--ModValue{}
						}
					}
				}
			`,
			warnings: [
				{
					message: messages.element('fooBar'),
					line: 2, column: 13,
					endLine: 2, endColumn: 19,
				},
				{
					message: messages.modifierName('MODNAME'),
					line: 3, column: 19,
					endLine: 3, endColumn: 26,
				},
				{
					message: messages.modifierValue('ModValue'),
					line: 5, column: 7,
					endLine: 5, endColumn: 15,
				},
			],
		},
		{
			description: 'Warns whole selector if an entity occurs multiple times',
			code: `
				.the-component__El--El {}
			`,
			warnings: [
				{
					message: messages.element('El'),
					line: 1, column: 1,
					endLine: 1, endColumn: 23,
				},
				{
					message: messages.modifierName('El'),
					line: 1, column: 1,
					endLine: 1, endColumn: 23,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as a keyword',
	config: [true, { blockPattern: 'PASCAL_CASE' }],
	accept: [
		{ code: '.MyBlock {}' },
		{ code: '.FooBar123 {}' },
	],
	reject: [
		{
			code: '.my-block {}',
			warnings: [
				{
					message: messages.block('my-block'),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
		{
			code: '.123Block {}',
			warnings: [
				{
					message: messages.block('123Block'),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as a string',
	config: [true, { blockPattern: 'PASCAL_CASE' }],
	accept: [
		{ code: '.MyBlock {}' },
		{ code: '.FooBar123 {}' },
	],
	reject: [
		{
			code: '.my-block {}',
			warnings: [
				{
					message: messages.block('my-block'),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
		{
			code: '.123Block {}',
			warnings: [
				{
					message: messages.block('123Block'),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as a RegExp in string form',
	config: [true, { blockPattern: '/^foo-[a-z]+$/' }],
	accept: [
		{ code: '.foo-bar {}' },
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.bar-foo {}',
			warnings: [
				{
					message: messages.block('bar-foo'),
					line: 1, column: 2,
					endLine: 1, endColumn: 9,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as an actual RegExp',
	config: [true, { blockPattern: /^foo-[a-z]+$/ }],
	accept: [
		{ code: '.foo-bar {}' },
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.bar-foo {}',
			warnings: [
				{
					message: messages.block('bar-foo'),
					line: 1, column: 2,
					endLine: 1, endColumn: 9,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as an array of mixed values',
	config: [true, { blockPattern: ['SNAKE_CASE', /^foo-[a-z]+$/, 'baz-*'] }],
	accept: [
		{ code: '.snake_case_selector {}' },
		{ code: '.foo-test {}' },
		{ code: '.baz-test {}' },
	],
	reject: [
		{
			code: '._bar_foo {}',
			warnings: [
				{
					message: messages.block('_bar_foo'),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
		{
			code: '.my-foo {}',
			warnings: [
				{
					message: messages.block('my-foo'),
					line: 1, column: 2,
					endLine: 1, endColumn: 8,
				},
			],
		},
	],
});

testRule({
	description: 'Pattern as a false (only for utility)',
	config: [true, { utilityPattern: false }],
	accept: [
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.foo-test.is-active {}',
			warnings: [
				{
					message: messages.utility('is-active'),
					line: 1, column: 11,
					endLine: 1, endColumn: 20,
				},
			],
		},
		{
			code: `
				.foo-test {
					&__element {
						&.is-active {}
					}
				}
			`,
			warnings: [
				{
					message: messages.utility('is-active'),
					line: 3, column: 5,
					endLine: 3, endColumn: 14,
				},
			],
		},
	],
});
