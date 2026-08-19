import rule from '../no-grouped-entities';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });
const testCssRule = createTestRule({ ruleName });

testRule({
	description: 'Default ownership behavior',
	config: [true],
	accept: [
		{
			description: 'Allows a group while it is the only declaration owner',
			code: `
				.block {
					&__title,
					&__label {}
				}
			`,
		},
		{
			description: 'Allows selector owners nested inside the original group',
			code: `
				.block {
					&__title,
					&__label {
						&:hover {}

						@media (width > 640px) {
							&:focus-visible {}
						}

						@at-root .theme-dark & {}
					}
				}
			`,
		},
		{
			description: 'Treats complete BEM identities as separate entities',
			code: `
				.block {
					&__item,
					&__item--active {}

					&__item--disabled {}
				}
			`,
		},
		{
			description: 'Ignores unresolved and ambiguous external selectors',
			code: `
				.block {
					&__title,
					&__label {}

					#{$unknown}__title {}
					&__title.foo__title {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports a grouped entity and references its later sibling owner',
			code: `
				.block {
					&__title,
					&__label {}

					&__title:hover {}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__title', 5),
					line: 2, column: 2,
					endLine: 2, endColumn: 10,
				},
			],
		},
		{
			description: 'Reports a grouped entity owned in a sibling conditional rule',
			code: `
				.block {
					&__title,
					&__label {}

					@media (width > 640px) {
						&__label {}
					}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__label', 6),
					line: 3, column: 2,
					endLine: 3, endColumn: 10,
				},
			],
		},
		{
			description: 'Reports the grouped branch and references its earlier separate owner',
			code: `
				.block {
					&__title {}

					&__title,
					&__label {}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__title', 2),
					line: 4, column: 2,
					endLine: 4, endColumn: 10,
				},
			],
		},
		{
			description: 'Reports an entity shared by overlapping groups in both groups',
			code: `
				.block {
					&__title,
					&__label {}

					&__label,
					&__icon {}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__label', 5),
					line: 3, column: 2,
					endLine: 3, endColumn: 10,
				},
				{
					message: messages.redeclared('.block__label', 3),
					line: 5, column: 2,
					endLine: 5, endColumn: 10,
				},
			],
		},
		{
			description: 'Reports the repeated complete modifier identity',
			code: `
				.block {
					&__item,
					&__item--active {}

					&__item--active:hover {}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__item--active', 5),
					line: 3, column: 2,
					endLine: 3, endColumn: 17,
				},
			],
		},
	],
});

testRule({
	description: 'Strict behavior',
	config: [true, { strict: true }],
	accept: [
		{
			description: 'Accepts different states and pseudo-elements of one entity',
			code: `
				.block {
					&__title:hover,
					&__title:focus-visible {}

					&__box::before,
					&__box::after {}
				}
			`,
		},
		{
			description: 'Accepts different contexts targeting one entity',
			code: `
				.block__link {
					&:hover,
					.toolbar:hover & {}
				}

				button.block__link[aria-current='true'],
				a.block__link[href] {}
			`,
		},
		{
			description: 'Uses the rightmost compound as the declaration target',
			code: `
				.block__source .block__target,
				.block__other .block__target {}
			`,
		},
		{
			description: 'Uses the most specific entity in a compound',
			code: `
				.block__item.block__item--active,
				.block__item--active:hover {}
			`,
		},
		{
			description: 'Ignores lists without multiple distinct BEM targets',
			code: `
				h1, h2 {}
				.block__title, h2, .block__title:hover {}
			`,
		},
		{
			description: 'Ignores selector lists inside functional pseudo-classes',
			code: `
				.block:is(.block__title, .block__label),
				.block__item {}
			`,
		},
		{
			description: 'Ignores nested selector lists inside functional pseudo-classes',
			code: `
				.block:nth-child(2n of :is(.block__title, .block__label)),
				.block__item {}
			`,
		},
		{
			description: 'Ignores unresolved interpolation and ambiguous targets',
			code: `
				.block {
					#{$unknown}, &__title {}
					&__item.foo__item, &__label {}
				}
			`,
		},
		{
			description: 'Ignores keyframe steps',
			code: `
				.block {
					@keyframes pulse {
						from, to {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports different BEM elements grouped in one rule',
			code: `
				.block {
					&__title,
					&__table-heading {}
				}
			`,
			warnings: [
				{
					message: messages.grouped('.block__table-heading', '.block__title'),
					line: 3, column: 2,
					endLine: 3, endColumn: 18,
				},
			],
		},
		{
			description: 'Does not treat parent selector-list expansion as another authored grouping',
			code: `
				.block__item,
				.block__label {
					&--active {}
				}
			`,
			warnings: [
				{
					message: messages.grouped('.block__label', '.block__item'),
					line: 2, column: 1,
					endLine: 2, endColumn: 14,
				},
			],
		},
		{
			description: 'Treats modifiers and modifier values as separate owners',
			code: `
				.block {
					&__item,
					&__item--active,
					&__item--theme--dark,
					&__item--theme--light {}
				}
			`,
			warnings: [
				{
					message: messages.grouped('.block__item--active', '.block__item'),
					line: 3, column: 2,
					endLine: 3, endColumn: 17,
				},
				{
					message: messages.grouped('.block__item--theme--dark', '.block__item'),
					line: 4, column: 2,
					endLine: 4, endColumn: 22,
				},
				{
					message: messages.grouped('.block__item--theme--light', '.block__item'),
					line: 5, column: 2,
					endLine: 5, endColumn: 23,
				},
			],
		},
		{
			description: 'Compares complete identities and reports each later distinct entity once',
			code: `
				.alpha__item,
				.beta__item,
				.alpha__item:hover,
				.gamma__item {}
			`,
			warnings: [
				{
					message: messages.grouped('.beta__item', '.alpha__item'),
					line: 2, column: 1,
					endLine: 2, endColumn: 12,
				},
				{
					message: messages.grouped('.gamma__item', '.alpha__item'),
					line: 4, column: 1,
					endLine: 4, endColumn: 13,
				},
			],
		},
		{
			description: 'Maps escaped class names back to their authored ranges',
			code: `.block__title\\:large, .block__label {}`,
			warnings: [
				{
					message: messages.grouped('.block__label', '.block__title:large'),
					line: 1, column: 23,
					endLine: 1, endColumn: 36,
				},
			],
		},
		{
			description: 'Resolves known Sass variables and selector-list offsets',
			code: `
				.block {
					$b: #{&};

					#{$b}__title,
					#{$b}__label {}
				}
			`,
			warnings: [
				{
					message: messages.grouped('.block__label', '.block__title'),
					line: 5, column: 2,
					endLine: 5, endColumn: 14,
				},
			],
		},
		{
			description: 'Checks selector lists authored in at-root and nest rules',
			code: `
				.block {
					@at-root &__title, &__label {}
					@nest &__icon, &__button {}
				}
			`,
			warnings: [
				{
					message: messages.grouped('.block__label', '.block__title'),
					line: 2, column: 21,
					endLine: 2, endColumn: 29,
				},
				{
					message: messages.grouped('.block__button', '.block__icon'),
					line: 3, column: 17,
					endLine: 3, endColumn: 26,
				},
			],
		},
	],
});

testRule({
	description: 'Custom separators',
	config: [true, {
		separators: {
			element: '--',
			modifier: '_',
			modifierValue: '_',
		},
	}],
	reject: [
		{
			code: `
				.block--title, .block--label {}
				.block--title:hover {}
			`,
			warnings: [
				{
					message: messages.redeclared('.block--title', 2),
					line: 1, column: 1,
					endLine: 1, endColumn: 14,
				},
			],
		},
	],
});

testRule({
	description: 'Custom default message',
	config: [true, {
		messages: {
			redeclared: (entity: string, line: number) => `Separate ${entity} from its group at line ${line}`,
		},
	}],
	reject: [
		{
			code: `
				.block__title, .block__label {}
				.block__title:hover {}
			`,
			warnings: [
				{
					message: `Separate .block__title from its group at line 2 (@morev/bem/no-grouped-entities)`,
					line: 1, column: 1,
					endLine: 1, endColumn: 14,
				},
			],
		},
	],
});

testRule({
	description: 'Custom strict message',
	config: [true, {
		strict: true,
		messages: {
			grouped: (entity: string, owner: string) => `Separate ${entity} from ${owner}`,
		},
	}],
	reject: [
		{
			code: `.block__title, .block__label {}`,
			warnings: [
				{
					message: `Separate .block__label from .block__title (@morev/bem/no-grouped-entities)`,
					line: 1, column: 16,
					endLine: 1, endColumn: 29,
				},
			],
		},
	],
});

testCssRule({
	description: 'Native CSS nesting',
	config: [true],
	accept: [
		{
			description: 'Accepts conditions of one entity',
			codeFilename: 'block.css',
			code: `
				.block__item {
					&:hover,
					.toolbar:hover & {}
				}
			`,
		},
		{
			description: 'Allows a native CSS group while it is the only owner',
			codeFilename: 'block.css',
			code: `
				.block {
					& .block__title,
					& .block__label {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports an entity with another native CSS owner',
			codeFilename: 'block.css',
			code: `
				.block {
					& .block__title,
					& .block__label {}

					& .block__label:hover {}
				}
			`,
			warnings: [
				{
					message: messages.redeclared('.block__label', 5),
					line: 3, column: 4,
					endLine: 3, endColumn: 17,
				},
			],
		},
	],
});
