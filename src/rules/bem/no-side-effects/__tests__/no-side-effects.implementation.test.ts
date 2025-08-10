import rule from '../no-side-effects';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

// Default options
testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'The empty component',
			code: `.the-component {}`,
		},
		{
			description: 'Does not validate incomplete input',
			code: `
				.the-component {
					@at-root
				}
			`,
		},
		{
			description: 'Do not report content without side-effects and nesting',
			code: `
				.the-component {}

				button.the-component__element {}
				.the-component:hover {}
				.the-component::before {}

				.the-component__element {}
				.the-component--modifier:hover {}

				.the-component.the-component--baz {}
				.the-component .the-component__foo {}

				.the-component__element div .the-component__foo {}

				@media (width >= 768px) {
					.the-component .the-component__foo {}
				}
			`,
		},
		{
			description: 'Do not report content without side-effects using nesting',
			code: `
				.the-component {

					&:hover {}
					&::before {}

					@at-root button.the-component {}

					&__element {}

					&--modifier {
						&:hover {}
					}

					&.the-component--baz {}

					@media (width >= 768px) {
						&::before {}
					}
				}
			`,
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
			// TODO: Try to resolve variables
			description: 'Component with some interpolated class',
			code: `
				.the-component {
					$b: #{&};

					#{$b} {}
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
		{
			description: 'Do not report selector inside :is()',
			code: `
				.the-component {}
				.the-component:is(&--mod, .bar) {}
			`,
		},
	],
	reject: [
		{
			description: 'Reports side-effects at root level',
			code: `
				.the-component {}
				.foo-component {}
				a {}

				@media (width >= 768px) {
					.the-component__element {}
					.foo .the-component:hover::before {}
					.foo-component {}
				}
			`,
			warnings: [
				{
					message: messages.rejected('.foo-component'),
					line: 2, column: 1,
					endLine: 2, endColumn: 15,
				},
				{
					message: messages.rejected('a'),
					line: 3, column: 1,
					endLine: 3, endColumn: 2,
				},
				{
					message: messages.rejected('.foo-component'),
					line: 8, column: 2,
					endLine: 8, endColumn: 16,
				},
			],
		},
		{
			description: 'Reports inline side-effect',
			code: `
				.the-component {}
				.the-component a {}
				.the-component * {}
				.the-component > a {}
				.the-component ~ .the-component + div {}
			`,
			warnings: [
				{
					message: messages.rejected('a'),
					line: 2, column: 16,
					endLine: 2, endColumn: 17,
				},
				{
					message: messages.rejected('*'),
					line: 3, column: 16,
					endLine: 3, endColumn: 17,
				},
				{
					message: messages.rejected('> a'),
					line: 4, column: 16,
					endLine: 4, endColumn: 19,
				},
				{
					message: messages.rejected('+ div'),
					line: 5, column: 33,
					endLine: 5, endColumn: 38,
				},
			],
		},
		{
			description: 'Reports side-effect using nesting',
			code: `
				.the-component {
					a {}

					.bar & {}
					&:hover {}
					&::before {}

					@nest & .the {}
					@at-root .block {}
				}
			`,
			warnings: [
				{
					message: messages.rejected('a'),
					line: 2, column: 2,
					endLine: 2, endColumn: 3,
				},
				{
					message: messages.rejected('.the'),
					line: 8, column: 10,
					endLine: 8, endColumn: 14,
				},
				{
					message: messages.rejected('.block'),
					line: 9, column: 11,
					endLine: 9, endColumn: 17,
				},
			],
		},
		{
			description: 'Reports only needed part of the selector',
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
			description: 'Reports complex selector',
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
			description: 'Reports complex compound selector',
			code: `
				.the-component {}
				.the-component__element table.another-one,
				.bar,
				.the-component .another-one {}
			`,
			warnings: [
				{
					message: messages.rejected('table.another-one'),
					line: 2, column: 25,
					endLine: 2, endColumn: 42,
				},
				{
					message: messages.rejected('.bar'),
					line: 3, column: 1,
					endLine: 3, endColumn: 5,
				},
				{
					message: messages.rejected('.another-one'),
					line: 4, column: 16,
					endLine: 4, endColumn: 28,
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
				.the-component__element, .the-component table, .the-component__foo {}
			`,
			warnings: [
				{
					message: messages.rejected('table'),
					line: 2, column: 41,
					endLine: 2, endColumn: 46,
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
			description: 'Reports in case of compound selectors',
			code: `
				.the-component {
					&__element,
					.foo-component,
					.bar-component {}
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
					line: 4, column: 2,
					endLine: 4, endColumn: 16,
				},
			],
		},
		{
			description: 'Reports full side effect in case if side-effect is splitted via nesting',
			code: `
				.the-component {
					.block {
						span {}
					}
				}
			`,
			warnings: [
				{
					message: messages.rejected('.block'),
					line: 2, column: 2,
					endLine: 2, endColumn: 8,
				},
				{
					message: messages.rejected('.block span'),
					line: 3, column: 3,
					endLine: 3, endColumn: 7,
				},
			],
		},
		{
			description: 'Does not report side-effects only for :pseudo states of another side-effect',
			code: `
				.the-component {
					a {
						&:hover {}
						&:active {}
						&::placeholder {}
					}
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
	],
});

// `ignore` option
testRule({
	description: '`ignore` as a `string[]`',
	config: [true, { ignore: ['b', 'span', '.swiper-*', /.*foo.*/] }],
	accept: [
		{
			description: 'Does not report ignored selectors',
			code: `
				.the-component {
					b {}

					.swiper-slide:hover {}

					.bar .foo .baz {}
				}

				.the-component span {}
			`,
		},
	],
	reject: [
		{
			description: 'Still reports another side-effects',
			code: `
				.the-component {
					.bar {}
				}
			`,
			warnings: [
				{
					message: messages.rejected('.bar'),
					line: 2, column: 2,
					endLine: 2, endColumn: 6,
				},
			],
		},
	],
});

// `messages` option
testRule({
	description: 'Custom messages',
	config: [true, {
		messages: {
			rejected: (selector: string) => `Rejected ${selector}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					> a {}
				}
			`,
			warnings: [
				{ message: `Rejected > a` },
			],
		},
	],
});
