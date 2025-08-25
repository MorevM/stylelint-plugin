import { KEBAB_CASE_REGEXP } from '#modules/shared';
import rule from '../selector-pattern';
import { normalizePattern } from '../utils';
import type { ProcessedPattern } from '../selector-pattern.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

const KEBAB_CASE_PATTERN = normalizePattern(KEBAB_CASE_REGEXP) as ProcessedPattern[];

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
						&--mod{
							&-v {
								&-v {}
							}
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
		{
			description: 'Does not throw on input with syntax errors',
			code: `
				.selector {
					&__el) {}
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
					message: messages.block('TheComponent', '.TheComponent', KEBAB_CASE_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 14,
				},
				{
					message: messages.block('TheComponent', '.TheComponent', KEBAB_CASE_PATTERN),
					line: 2, column: 2,
					endLine: 2, endColumn: 14,
				},
				{
					message: messages.block('AnotherComponent', '.AnotherComponent', KEBAB_CASE_PATTERN),
					line: 3, column: 10,
					endLine: 3, endColumn: 26,
				},
				{
					message: messages.block('BazComponent', '.BazComponent', KEBAB_CASE_PATTERN),
					line: 4, column: 4,
					endLine: 4, endColumn: 16,
				},
				{
					message: messages.block('FooComponent', '.FooComponent', KEBAB_CASE_PATTERN),
					line: 6, column: 12,
					endLine: 6, endColumn: 24,
				},
				{
					message: messages.block('BarComponent', '.BarComponent__element', KEBAB_CASE_PATTERN),
					line: 7, column: 11,
					endLine: 7, endColumn: 23,
				},
			],
		},
		{
			description: 'Reports consecutive classes',
			code: `
				.the-component.FooComponent {}
			`,
			warnings: [
				{
					message: messages.block('FooComponent', '.FooComponent', KEBAB_CASE_PATTERN),
					line: 1, column: 16,
					endLine: 1, endColumn: 28,
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
					message: messages.element('fooBar', '.the-component__fooBar', KEBAB_CASE_PATTERN),
					line: 2, column: 5,
					endLine: 2, endColumn: 11,
				},
				{
					message: messages.element('foo__bar', '.the-component__foo__bar', KEBAB_CASE_PATTERN),
					line: 3, column: 5,
					endLine: 3, endColumn: 13,
				},
				{
					message: messages.element('FooBar', '.the-component__FooBar', KEBAB_CASE_PATTERN),
					line: 4, column: 5,
					endLine: 4, endColumn: 11,
				},
				{
					message: messages.element('fooBar', '.the-component__fooBar', KEBAB_CASE_PATTERN),
					line: 6, column: 3,
					endLine: 6, endColumn: 7,
				},
				{
					message: messages.element('foo__bar', '.the-component__foo__bar', KEBAB_CASE_PATTERN),
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
					message: messages.modifierName('modName', '.the-component__foo--modName', KEBAB_CASE_PATTERN),
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
					message: messages.modifierValue('modValue', '.the-component__foo--mod-name--modValue', KEBAB_CASE_PATTERN),
					line: 4, column: 7,
					endLine: 4, endColumn: 15,
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
							&--ModValue {}
						}
					}
				}
			`,
			warnings: [
				{
					message: messages.element('fooBar', '.the-component__fooBar', KEBAB_CASE_PATTERN),
					line: 2, column: 13,
					endLine: 2, endColumn: 19,
				},
				{
					message: messages.modifierName('MODNAME', '.the-component__foo--MODNAME', KEBAB_CASE_PATTERN),
					line: 3, column: 19,
					endLine: 3, endColumn: 26,
				},
				{
					message: messages.modifierName('MODNAME', '.the-component__fooBar--MODNAME', KEBAB_CASE_PATTERN),
					line: 3, column: 19,
					endLine: 3, endColumn: 26,
				},
				{
					message: messages.modifierValue('ModValue', '.the-component__foo--mod-name--ModValue', KEBAB_CASE_PATTERN),
					line: 5, column: 7,
					endLine: 5, endColumn: 15,
				},
				{
					message: messages.modifierValue('ModValue', '.the-component__fooBar--mod-name--ModValue', KEBAB_CASE_PATTERN),
					line: 5, column: 7,
					endLine: 5, endColumn: 15,
				},
				{
					message: messages.modifierValue('ModValue', '.the-component__foo--MODNAME--ModValue', KEBAB_CASE_PATTERN),
					line: 5, column: 7,
					endLine: 5, endColumn: 15,
				},
				{
					message: messages.modifierValue('ModValue', '.the-component__fooBar--MODNAME--ModValue', KEBAB_CASE_PATTERN),
					line: 5, column: 7,
					endLine: 5, endColumn: 15,
				},
			],
		},
		{
			description: 'Warns only needed selector part if an entity occurs multiple times',
			code: `
				.the-component__El--El {}
			`,
			warnings: [
				{
					message: messages.element('El', '.the-component__El--El', KEBAB_CASE_PATTERN),
					line: 1, column: 17,
					endLine: 1, endColumn: 19,
				},
				{
					message: messages.modifierName('El', '.the-component__El--El', KEBAB_CASE_PATTERN),
					line: 1, column: 21,
					endLine: 1, endColumn: 23,
				},
			],
		},
	],
});

const KEYWORD_PASCAL_PATTERN = normalizePattern('PASCAL_CASE') as ProcessedPattern[];

// Pattern as a keyword
testRule({
	description: 'Pattern as a keyword',
	config: [true, { patterns: { block: 'PASCAL_CASE' } }],
	accept: [
		{ code: '.MyBlock {}' },
		{ code: '.FooBar123 {}' },
	],
	reject: [
		{
			code: '.my-block {}',
			warnings: [
				{
					message: messages.block('my-block', '.my-block', KEYWORD_PASCAL_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
		{
			code: '.123Block {}',
			warnings: [
				{
					message: messages.block('123Block', '.123Block', KEYWORD_PASCAL_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
	],
});

const FOO_PATTERN = normalizePattern('foo-*') as ProcessedPattern[];

// Pattern as a string
testRule({
	description: 'Pattern as a string',
	config: [true, { patterns: { block: 'foo-*' } }],
	accept: [
		{ code: '.foo-block {}' },
	],
	reject: [
		{
			code: '.my-block {}',
			warnings: [
				{
					message: messages.block('my-block', '.my-block', FOO_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
	],
});

const FOO_STRING_REGEX_PATTERN = normalizePattern('/^foo-[a-z]+$/') as ProcessedPattern[];

// Pattern as a RegExp in string form
testRule({
	description: 'Pattern as a RegExp in string form',
	config: [true, { patterns: { block: '/^foo-[a-z]+$/' } }],
	accept: [
		{ code: '.foo-bar {}' },
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.bar-foo {}',
			warnings: [
				{
					message: messages.block('bar-foo', '.bar-foo', FOO_STRING_REGEX_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 9,
				},
			],
		},
	],
});

const FOO_REGEX_PATTERN = normalizePattern('/^foo-[a-z]+$/') as ProcessedPattern[];

// Pattern as a RegExp
testRule({
	description: 'Pattern as an actual RegExp',
	config: [true, { patterns: { block: /^foo-[a-z]+$/ } }],
	accept: [
		{ code: '.foo-bar {}' },
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.bar-foo {}',
			warnings: [
				{
					message: messages.block('bar-foo', '.bar-foo', FOO_REGEX_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 9,
				},
			],
		},
	],
});

const MIXED_PATTERN = normalizePattern(['SNAKE_CASE', /^foo-[a-z]+$/, 'baz-*']) as ProcessedPattern[];

// Pattern as an array of mixed values
testRule({
	description: 'Pattern as an array of mixed values',
	config: [true, { patterns: { block: ['SNAKE_CASE', /^foo-[a-z]+$/, 'baz-*'] } }],
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
					message: messages.block('_bar_foo', '._bar_foo', MIXED_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 10,
				},
			],
		},
		{
			code: '.my-foo {}',
			warnings: [
				{
					message: messages.block('my-foo', '.my-foo', MIXED_PATTERN),
					line: 1, column: 2,
					endLine: 1, endColumn: 8,
				},
			],
		},
	],
});

// Pattern as a false (only for modifier value classes)
testRule({
	description: 'Pattern as a false (only for modifier value classes)',
	config: [true, { patterns: { modifierValue: false } }],
	accept: [
		{ code: '.foo-test {}' },
	],
	reject: [
		{
			code: '.foo-test--theme--dark {}',
			warnings: [
				{
					message: messages.modifierValue('dark', '.foo-test--theme--dark', false),
					line: 1, column: 19,
					endLine: 1, endColumn: 23,
				},
			],
		},
		{
			code: `
				.foo-test {
					&__element {
						&--is--active {}
					}
				}
			`,
			warnings: [
				{
					message: messages.modifierValue('active', '.foo-test__element--is--active', false),
					line: 3, column: 10,
					endLine: 3, endColumn: 16,
				},
			],
		},
	],
});

// `ignoredBlocks` option
testRule({
	description: '`ignoredBlocks` option',
	config: [true, { ignoreBlocks: ['FOO', 'swiper-*', /^tippy.*/, '/d\\d+.*/'] }],
	accept: [
		{ code: '.FOO {}' },
		{ code: '.swiper-slide__ElEmEnt.blah-blah {}' },
		{
			code: `
				.tippy {
					&__STRANGE {
						&--SELECTOR {}
					}
				}
			`,
		},
		{
			code: `
				.d2 {
					&__STRANGE {
						&--SELECTOR {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Still warns rest selectors',
			code: `
				.FOOBAR {}
				.non-swiper-BLOCK__element {}
				.dB {}
			`,
			warnings: [
				{ message: messages.block('FOOBAR', '.FOOBAR', KEBAB_CASE_PATTERN) },
				{ message: messages.block('non-swiper-BLOCK', '.non-swiper-BLOCK__element', KEBAB_CASE_PATTERN) },
				{ message: messages.block('dB', '.dB', KEBAB_CASE_PATTERN) },
			],
		},
	],
});

// `messages` option
testRule({
	description: 'Custom messages',
	config: [true, {
		messages: {
			block: (name: string, selector: string, patterns: ProcessedPattern[]) => `Block ${name} ${selector}`,
			element: (name: string, selector: string, patterns: ProcessedPattern[]) => `Element ${name} ${selector}`,
			modifierName: (name: string, selector: string, patterns: ProcessedPattern[]) => `Modifier name ${name} ${selector}`,
			modifierValue: (name: string, selector: string, patterns: ProcessedPattern[]) => `Modifier value ${name} ${selector}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.FOOBAR {
					&__ELEMENT {
						&--MODIFIER {
							&--VALUE {
								&:hover {}
							}
						}
					}
				}
			`,
			warnings: [
				{ message: `Block FOOBAR .FOOBAR` },
				{ message: `Element ELEMENT .FOOBAR__ELEMENT` },
				{ message: `Modifier name MODIFIER .FOOBAR__ELEMENT--MODIFIER` },
				{ message: `Modifier value VALUE .FOOBAR__ELEMENT--MODIFIER--VALUE` },
			],
		},
	],
});
