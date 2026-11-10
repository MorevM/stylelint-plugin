import rule from '../no-detached-entities';
import type { SecondaryOption } from '../no-detached-entities.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });
const testCssRule = createTestRule({ ruleName });
const ungroupedValuesNesting = {
	blockModifierValue: ['block', 'blockModifier'],
	elementModifierValue: ['element', 'elementModifier'],
} satisfies SecondaryOption['nesting'];

testRule({
	description: 'SCSS entity ownership with default options',
	config: true,
	accept: [
		{
			description: 'Keeps modifiers inside their base entities and allows lone values without modifier-name groups',
			code: `
				.block {
					&--active {}
					&--size--large {}
					&--theme {
						&--dark {}
						&--light {}
					}
					&__title {
						&:hover,
						&::before,
						&:is(:hover, :focus),
						&:has(.icon, .badge),
						&:not(.disabled, .loading),
						&[aria-current='true'],
						&.is-active {}
						&.block__title--active {}
						&.block__title--size--large {}
						&--theme {
							&--dark {
								&:hover {}
							}
							&--light {}
						}
					}
				}
			`,
		},
		{
			description: 'Compares owner BEM identity independently of its local state',
			code: `
				.block {
					&:is(:hover, :focus) {
						@at-root .block__title {}
					}
				}
			`,
		},
		{
			description: 'Keeps conditional wrappers transparent to lexical ownership',
			code: `
				.block {
					@media (width <= 85px) {
						@supports (display: grid) {
							@nest &__title {}
						}
					}
				}
			`,
		},
		{
			description: 'Keeps lone modifier values independent across root and separate media regions',
			code: `
				.card {
					&--theme--system {}
				}

				@media (width <= 85px) {
					.card {
						&--theme--dark {}
					}
				}

				@media (width > 85px) {
					.card {
						&--theme--light {}
					}
				}

				@media (width <= 85px) {
					.card {
						&--theme--contrast {}
					}
				}
			`,
		},
		{
			description: 'Does not impose a conditional modifier group on outer or sibling declarations',
			code: `
				.card {
					&--theme--dark {}
				}

				@media (width <= 85px) {
					.card {
						&--theme {}
					}
				}

				@media (width > 85px) {
					.card {
						&--theme--light {}
					}
				}
			`,
		},
		{
			description: 'Separates selector contexts including different combinators',
			code: `
				.dark .card {
					&--theme {}
				}

				.light .card {
					&--theme--light {}
				}

				.dark > .card {
					&--theme--contrast {}
				}

				.card {
					&--theme--system {}
				}
			`,
		},
		{
			description: 'Keeps hoisted values separate from the conditions removed by static at-root queries',
			code: `
				.card {
					@media (width <= 85px) {
						&--theme--dark {}
						@at-root (without: media) {
							&--theme--light {}
						}
						@supports (display: grid) {
							&--size--small {}
							@at-root (with: supports) {
								.card {
									&--size--large {}
								}
							}
						}
					}
				}
			`,
		},
		{
			description: 'Skips indeterminate targets or owners',
			code: `
				#{$unknown}__title {}

				#{$unknown} {
					@at-root .block__target:hover {}
				}

				.block__title.block__label {}

				:is(.block__title, .block__label) {
					@at-root .block__target:hover {}
				}

				:where(.block) {
					@at-root .block__target:hover {}
				}

				.block__title.block__label {
					@at-root .block__target:hover {}
				}
			`,
		},
		{
			description: 'Distinguishes local nesting from authored relations under inherited context',
			code: `
				.layout .block {
					&__title {
						&:has(> .icon, .badge) {}
					}
					.block__title:hover {}
					.theme &__label:hover {}
					$relation: '.theme .wrapper';
					#{$relation}&__icon:hover {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'References the block in the same media region when several declarations exist',
			code: `
				.the-component {}

				.the-component__title--large {}

				@media (width <= 85px) {
					.the-component {}
					.the-component__abc {}
				}
			`,
			warnings: [
				{ line: 3, message: messages.detached('.the-component__title--large', [
					{ selector: '.the-component__title' },
				], [{ selector: '.the-component', line: 1 }, { selector: '.the-component__title' }]) },
				{ line: 7, message: messages.detached('.the-component__abc', [{ selector: '.the-component', line: 6 }], []) },
			],
		},
		{
			description: 'Prefers lexical ancestors and otherwise the nearest declaration in the same context',
			code: `
				.card {}

				.card {
					@at-root .card {}
					&__title:hover {}
				}

				.card {}

				.card__label:hover {}
			`,
			warnings: [
				{ message: messages.detached('.card__title:hover', [{ selector: '.card__title' }], [
					{ selector: '.card', line: 3 }, { selector: '.card__title' },
				]) },
				{ message: messages.detached('.card__label:hover', [{ selector: '.card__label' }], [
					{ selector: '.card', line: 8 }, { selector: '.card__label' },
				]) },
			],
		},
		{
			description: 'Uses outer selector contexts for exists and groups values only inside their media region',
			code: `
				.theme .card--size {}

				@media (width <= 85px) {
					.theme .layout .card {
						&--size--large {}
						&--theme--dark {}
						&--theme--light {}
					}
				}
			`,
			warnings: [
				{ message: messages.detached('.card--size--large', [{ selector: '.card--size', line: 1 }], []) },
				{ message: messages.detached('.card--theme--dark', [{ selector: '.card--theme' }], [
					{ selector: '.card', line: 4 }, { selector: '.card--theme' },
				]) },
				{ message: messages.detached('.card--theme--light', [{ selector: '.card--theme' }], [
					{ selector: '.card', line: 4 }, { selector: '.card--theme' },
				]) },
			],
		},
		{
			description: 'Reports local extensions under inherited context once across parent-list expansions',
			code: `
				.layout .block, .theme .block {
					&__title:hover {}
				}
			`,
			message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], [
				{ selector: '.block', line: 1 }, { selector: '.block__title' },
			]),
			line: 2, column: 2, endLine: 2, endColumn: 16,
		},
		{
			description: 'Counts existing and shared modifier groups under inherited context',
			code: `
				.layout .block {
					&--size--large {}
					&--size {}
					&--theme--dark {}
					&--theme--light {}
				}
			`,
			warnings: [
				{ message: messages.detached('.block--size--large', [{ selector: '.block--size', line: 3 }], []) },
				{ message: messages.detached('.block--theme--dark', [{ selector: '.block--theme' }], [
					{ selector: '.block', line: 1 }, { selector: '.block--theme' },
				]) },
				{ message: messages.detached('.block--theme--light', [{ selector: '.block--theme' }], [
					{ selector: '.block', line: 1 }, { selector: '.block--theme' },
				]) },
			],
		},
		{
			description: 'Requires complete entity owners for direct targets with functional conditions',
			code: `
				.block:is(:hover, :focus) {}

				.block:has(.icon, .badge) {}

				.block:not(.disabled, .loading) {}

				.block__title:nth-child(2n of :is(.is-active, .is-current)) {}
			`,
			warnings: [
				{ message: messages.detached('.block:is(:hover, :focus)', [{ selector: '.block' }], []) },
				{ message: messages.detached('.block:has(.icon, .badge)', [{ selector: '.block' }], []) },
				{ message: messages.detached('.block:not(.disabled, .loading)', [{ selector: '.block' }], []) },
				{ message: messages.detached(
					'.block__title:nth-child(2n of :is(.is-active, .is-current))',
					[{ selector: '.block__title' }],
					[{ selector: '.block' }, { selector: '.block__title' }],
				) },
			],
		},
		{
			description: 'Checks local extensions after an unrelated standalone element',
			code: `
				.early__item {}

				.component {}

				.component__label:hover {}
			`,
			warnings: [
				{ line: 1, message: messages.detached('.early__item', [{ selector: '.early' }], []) },
				{
					line: 5,
					message: messages.detached('.component__label:hover', [{ selector: '.component__label' }], [
						{ selector: '.component', line: 3 }, { selector: '.component__label' },
					]),
				},
			],
		},
		{
			description: 'Reports the nearest missing owner independently for every block and entity kind',
			code: `
				.alpha {}

				.block {
					&__title {}
					&__title--active {}
					&__title--theme--dark {}
					&__title--active:hover {}
				}
			`,
			warnings: [
				{ message: messages.detached('.block__title--active', [{ selector: '.block__title', line: 4 }], []) },
				{ message: messages.detached('.block__title--theme--dark', [{ selector: '.block__title', line: 4 }], []) },
				{ message: messages.detached(
					'.block__title--active:hover', [{ selector: '.block__title--active', line: 5 }], [],
				) },
			],
		},
		{
			description: 'Requires existing modifier-name groups even when declared after their values',
			code: `
				.block {
					&--theme--dark {}
					&--theme {}
					&__title {
						&--theme--dark {}
						&--theme {}
					}
				}
			`,
			warnings: [
				{ message: messages.detached('.block--theme--dark', [{ selector: '.block--theme', line: 3 }], []) },
				{ message: messages.detached(
					'.block__title--theme--dark', [{ selector: '.block__title--theme', line: 6 }], [],
				) },
			],
		},
		{
			description: 'Requires a shared modifier-name group for distinct values of block and element modifiers',
			code: `
				.block {
					&--theme--dark {}
					&--theme--light {}
					&__title {
						&--theme--dark {}
						&--theme--light {}
					}
				}
			`,
			warnings: [
				{ message: messages.detached('.block--theme--dark', [{ selector: '.block--theme' }], [
					{ selector: '.block', line: 1 }, { selector: '.block--theme' },
				]) },
				{ message: messages.detached('.block--theme--light', [{ selector: '.block--theme' }], [
					{ selector: '.block', line: 1 }, { selector: '.block--theme' },
				]) },
				{ message: messages.detached('.block__title--theme--dark', [{ selector: '.block__title--theme' }], [
					{ selector: '.block__title', line: 4 }, { selector: '.block__title--theme' },
				]) },
				{ message: messages.detached('.block__title--theme--light', [{ selector: '.block__title--theme' }], [
					{ selector: '.block__title', line: 4 }, { selector: '.block__title--theme' },
				]) },
			],
		},
		{
			description: 'Rejects foreign blocks and sibling entities despite a matching outer block',
			code: `
				.other {
					@at-root .block__title {}
				}

				.block {
					&__other {
						@at-root .block__title--theme--dark {}
					}
				}
			`,
			warnings: [
				{ message: messages.detached('.block__title', [{ selector: '.block', line: 5 }], []) },
				{
					message: messages.detached(
						'.block__title--theme--dark',
						[{ selector: '.block__title', line: 2 }],
						[],
					),
				},
			],
		},
		{
			description: 'Rejects lexical owners without a BEM target, including exclusion and relational conditions',
			code: `
				main {
					@at-root .block__title {}
				}

				:not(.block) {
					@at-root .block__title {}
				}

				:has(.block) {
					@at-root .block__title {}
				}
			`,
			warnings: [
				{ line: 2, message: messages.detached('.block__title', [{ selector: '.block' }], []) },
				{ line: 6, message: messages.detached('.block__title', [{ selector: '.block' }], []) },
				{ line: 10, message: messages.detached('.block__title', [{ selector: '.block' }], []) },
			],
		},
		{
			description: 'Does not hide foreign lexical ownership behind functional conditions',
			code: `
				.other {
					&:is(:hover, :focus) {
						@at-root .block__title {}
					}
				}
			`,
			message: messages.detached('.block__title', [{ selector: '.block' }], []),
			line: 3,
		},
		{
			description: 'Reports a local extension inside a query that removes emitted ancestry',
			code: `
				.block {
					@at-root (without: rule) {
						.block__title:hover {}
					}
				}
			`,
			message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], [
				{ selector: '.block', line: 1 }, { selector: '.block__title' },
			]),
			line: 3, column: 3, endLine: 3, endColumn: 22,
		},
		{
			description: 'Preserves source ranges after a nest at-rule prefix',
			code: `
				.block {
					@nest &__title:hover {}
				}
			`,
			message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], [
				{ selector: '.block', line: 1 }, { selector: '.block__title' },
			]),
			line: 2, column: 8, endLine: 2, endColumn: 22,
		},
		{
			description: 'Reports only the first failing expansion of one authored branch',
			code: `
				.alpha, .beta {
					&__title:hover {}
				}
			`,
			message: messages.detached('.alpha__title:hover', [{ selector: '.alpha__title' }], [
				{ selector: '.alpha', line: 1 }, { selector: '.alpha__title' },
			]),
		},
		{
			description: 'Checks every lexical owner when hoisted selector expansions coincide',
			code: `
				.block, .other {
					@at-root .block__title {}
				}
			`,
			message: messages.detached('.block__title', [{ selector: '.block', line: 1 }], []),
		},
		{
			description: 'Preserves separate authored branches even when their resolved selectors match',
			code: `
				.block {
					&__title:hover, &__title:hover {}
				}
			`,
			warnings: [
				{ message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], [
					{ selector: '.block', line: 1 }, { selector: '.block__title' },
				]), line: 2, column: 2, endLine: 2, endColumn: 16 },
				{ message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], [
					{ selector: '.block', line: 1 }, { selector: '.block__title' },
				]), line: 2, column: 18, endLine: 2, endColumn: 32 },
			],
		},
	],
});

testRule({
	description: 'Flat modifier-value policies under inherited context',
	config: [true, { nesting: {
		blockModifierValue: ['block'],
		elementModifierValue: ['element'],
	} }],
	reject: [{
		description: 'Requires values directly inside their base entity despite the external context',
		code: `
			.layout .block {
				&--theme {
					&--dark {}
				}
				&__title {
					&--theme {
						&--dark {}
					}
				}
			}
		`,
		warnings: [
			{ message: messages.detached('.block--theme--dark', [{ selector: '.block', line: 1 }], []),
				line: 3, column: 3, endLine: 3, endColumn: 10 },
			{ message: messages.detached('.block__title--theme--dark', [{ selector: '.block__title', line: 5 }], []),
				line: 7, column: 4, endLine: 7, endColumn: 11 },
		],
	}],
});

testRule({
	description: 'Custom policies allowing grouped and ungrouped modifier values',
	config: [true, { nesting: ungroupedValuesNesting }],
	accept: [
		{
			description: 'Accepts both modifier-value forms under their immediate owners',
			code: `
				.block {
					&__title {
						&--theme--light {}
						&--theme {
							&--dark {
								&:hover {}
							}
						}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Shows complete shortest paths to a declared block for values and states',
			code: `
				.block {}

				.block__title--theme--dark {}

				.block__label--theme--dark:hover {}
			`,
			warnings: [
				{
					message: 'Expected nesting for ".block__title--theme--dark": '
						+ '".block" (declared at line 1) > ".block__title" > ".block__title--theme--dark".'
						+ ' (@morev/bem/no-detached-entities)',
				},
				{
					message: messages.detached('.block__label--theme--dark:hover', [{ selector: '.block__label--theme--dark' }], [
						{ selector: '.block', line: 1 },
						{ selector: '.block__label' },
						{ selector: '.block__label--theme--dark' },
					]),
				},
			],
		},
		{
			description: 'Includes every missing owner when no block is declared',
			code: `
				.block__other {}

				.block__title--active:hover {}
			`,
			warnings: [
				{ message: messages.detached('.block__other', [{ selector: '.block' }], []) },
				{
					message: messages.detached('.block__title--active:hover', [{ selector: '.block__title--active' }], [
						{ selector: '.block' },
						{ selector: '.block__title' },
						{ selector: '.block__title--active' },
					]),
				},
			],
		},
		{
			description: 'Uses an existing modifier-name owner without requiring its missing base',
			code: `
				.block--theme {}

				.block--theme--dark {}

				.block--theme--light:hover {}
			`,
			warnings: [
				{ message: messages.detached('.block--theme', [{ selector: '.block' }], []) },
				{
					message: messages.detached(
						'.block--theme--dark', [{ selector: '.block' }, { selector: '.block--theme', line: 1 }], [],
					),
				},
				{
					message: messages.detached('.block--theme--light:hover', [{ selector: '.block--theme--light' }], [
						{ selector: '.block--theme', line: 1 },
						{ selector: '.block--theme--light' },
					]),
				},
			],
		},
		{
			description: 'Locates later owners by authored branch and keeps the first declaration',
			code: `
				.block {
					$b: #{&};

					&__title--theme--dark {}

					@at-root #{$b}__title,
						#{$b}__label {}

					&__title {
						&--theme {}
					}

					&__label:hover {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__title--theme--dark', [
						{ selector: '.block__title', line: 6 }, { selector: '.block__title--theme', line: 10 },
					], []),
				},
				{
					message: 'Expected ".block__label:hover" to be declared within ".block__label" (declared at line 7).'
						+ ' (@morev/bem/no-detached-entities)',
				},
			],
		},
	],
});

for (const options of [
	{ nesting: { ...ungroupedValuesNesting, element: [{ parent: 'block', when: 'exists' }] } },
	{ nesting: ungroupedValuesNesting, ignore: ['.block__title'] },
] satisfies SecondaryOption[]) {
	testRule({
		description: `Custom paths respect standalone owner exceptions ${JSON.stringify(options)}`,
		config: [true, options],
		reject: [{
			description: 'Does not require a block when the missing element can stand alone',
			code: `
				.block__title--active {}
			`,
			message: messages.detached('.block__title--active', [{ selector: '.block__title' }], []),
		}],
	});
}

testCssRule({
	description: 'Native CSS ignores structural SCSS requirements',
	config: true,
	accept: [
		{
			description: 'Accepts standalone entities with their nested local extensions',
			code: `
				.block__title {
					&:hover {}
				}

				.block__title--active {}

				.block__title--theme--dark {}
			`,
		},
	],
	reject: [
		{
			description: 'Requires local extensions to remain inside their complete entity',
			code: `
				.block:hover {}

				.block:has(.icon, .badge) {}

				.block__title--active::before {}
			`,
			warnings: [
				{ message: messages.detached('.block:hover', [{ selector: '.block' }], []) },
				{ message: messages.detached('.block:has(.icon, .badge)', [{ selector: '.block' }], []) },
				{ message: messages.detached('.block__title--active::before', [{ selector: '.block__title--active' }], []) },
			],
		},
		{
			description: 'Checks local CSS extensions under inherited context',
			code: `
				.layout .block {
					&:hover {}
					&.block__title:hover {}
				}
			`,
			message: messages.detached('.block.block__title:hover', [{ selector: '.block__title' }], []),
		},
		{
			description: 'References compatible CSS owners without borrowing declarations from sibling layers or scopes',
			code: `
				.card {}

				@container (width > 20rem) {
					.card {}
					.card:hover {}
				}

				@layer base {
					.button {}
				}

				@layer components {
					.button:hover {}
				}

				@scope (.light) {
					.title {}
				}

				@scope (.dark) {
					.title:hover {}
				}
			`,
			warnings: [
				{ message: messages.detached('.card:hover', [{ selector: '.card', line: 4 }], []) },
				{ message: messages.detached('.button:hover', [{ selector: '.button' }], []) },
				{ message: messages.detached('.title:hover', [{ selector: '.title' }], []) },
			],
		},
	],
});

testRule({
	description: 'Conditional block ownership without a fallback',
	config: [true, {
		nesting: { element: [{ parent: 'block', when: 'exists' }] },
		ignore: ['.block', '.block--compact'],
	}],
	accept: [
		{
			description: 'Skips incomplete selectors without inventing owners or source ranges',
			code: `
				.block-- {}

				> {
					.block__title:hover {}
				}

				.block__title {
					&--active {
						> {}
					}
				}
			`,
		},
		{
			description: 'Only counts explicit base targets as block declarations',
			code: `
				.block--compact {}

				.block:hover {}

				.block:has(.icon, .badge) {}

				.block .other {}

				#{$unknown} {}

				@supports (display: grid) {
					.block__title {
						&:hover {}
					}
				}
			`,
		},
		{
			description: 'Allows a foreign lexical owner when the required block does not exist',
			code: `
				.other {
					@at-root .block__title {}
				}
			`,
		},
		{
			description: 'Does not count a block declared only inside a narrower conditional region',
			code: `
				.block__title {}

				@supports (display: grid) {
					.block {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Counts later ignored declarations in the same context and outer contexts',
			code: `
				@supports (display: grid) {
					.block__title {}
					.block {}
				}

				@media (width <= 85px) {
					.block__label {}
				}

				.block {}
			`,
			warnings: [
				{ message: messages.detached('.block__title', [{ selector: '.block', line: 3 }], []) },
				{ message: messages.detached('.block__label', [{ selector: '.block', line: 10 }], []) },
			],
		},
		{
			description: 'Still requires owners for modifiers and local extensions',
			code: `
				.block__title--active {}

				.block__title:hover {}
			`,
			warnings: [
				{ message: messages.detached('.block__title--active', [{ selector: '.block__title' }], []) },
				{ message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], []) },
			],
		},
	],
});

testRule({
	description: 'Canonical target exclusions',
	config: [true, { ignore: ['.block__legacy', '.vendor-*', /^\.block__ignored/] }],
	accept: [
		{
			description: 'Matches exact targets, wildcards, and regular expressions while retaining ignored owners',
			code: `
				.block__legacy:hover {}

				.block__legacy {
					&--active {}
				}

				.vendor-card__title:hover {}

				.block__ignored:hover {}
			`,
		},
	],
	reject: [
		{
			description: 'Does not implicitly ignore modifiers or descendants',
			code: `
				.other {
					@at-root .block__legacy:hover {}
					@at-root .block__legacy--active {}
				}

				.block__legacy {
					@at-root .block__other:hover {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__legacy--active', [{ selector: '.block__legacy', line: 6 }], []),
				},
				{ message: messages.detached('.block__other:hover', [{ selector: '.block__other' }], [
					{ selector: '.block' }, { selector: '.block__other' },
				]) },
			],
		},
	],
});

testRule({
	description: 'String ignore patterns',
	config: [true, { ignore: ['/ignored/', '.block__tit'] }],
	accept: [{
		description: 'Recognizes string-form regular expressions',
		code: `
			.block__ignored:hover {}
		`,
	}],
	reject: [
		{
			description: 'Still requires complete matches for plain strings',
			code: `
				.block__title {}
			`,
			message: messages.detached('.block__title', [{ selector: '.block' }], []),
		},
	],
});

testRule({
	description: 'Overlapping modifier separators',
	config: [true, { separators: { modifier: '--', modifierValue: '-' } }],
	accept: [
		{
			description: 'Uses the base owner when an incomplete modifier resolves only a value',
			code: `
				.block {
					&-- {}
				}
			`,
		},
	],
});

testRule({
	description: 'Explicit modifier-name grouping',
	config: [true, { nesting: {
		blockModifierValue: ['blockModifier'],
		elementModifier: ['element'],
		elementModifierValue: ['elementModifier'],
	} }],
	accept: [{
		description: 'Accepts the full block and element modifier hierarchy',
		code: `
			.block {
				&--theme {
					&--dark {}
				}
				&__title {
					&--theme {
						&--light {}
					}
				}
			}
		`,
	}],
	reject: [{
		description: 'Includes mandatory modifier-name groups in the creation path',
		code: `
			.block--theme--dark {}

			.block__title--theme--dark:hover {}
		`,
		warnings: [
			{ message: messages.detached('.block--theme--dark', [{ selector: '.block--theme' }], [
				{ selector: '.block' }, { selector: '.block--theme' },
			]) },
			{ message: messages.detached('.block__title--theme--dark:hover', [{ selector: '.block__title--theme--dark' }], [
				{ selector: '.block' }, { selector: '.block__title' },
				{ selector: '.block__title--theme' }, { selector: '.block__title--theme--dark' },
			]) },
		],
	}],
});

testRule({
	description: 'Empty structural policies retain local extension ownership',
	config: [true, { nesting: {
		element: [],
		blockModifier: [],
		blockModifierValue: [],
		elementModifier: [],
		elementModifierValue: [],
	} }],
	accept: [{
		description: 'Accepts standalone structural entities and arbitrary lexical placement',
		code: `
			.block__title {}

			.block--active {}

			.block--theme--dark {}

			.block__title--active {
				&:hover {}
			}

			main {
				@at-root .block__title--theme--dark {}
			}
		`,
	}],
	reject: [{
		description: 'Still requires an entity wrapper for states and qualifiers',
		code: `
			.block__title:hover {}

			.block__title--active[aria-current] {}
		`,
		warnings: [
			{ message: messages.detached('.block__title:hover', [{ selector: '.block__title' }], []) },
			{ message: messages.detached(
				'.block__title--active[aria-current]', [{ selector: '.block__title--active' }], [],
			) },
		],
	}],
});

testRule({
	description: 'Empty policies preserve owner evidence and omitted defaults',
	config: [true, { nesting: {
		element: [],
		elementModifier: [{ parent: 'element', when: 'exists' }, 'block'],
	} }],
	reject: [{
		description: 'Uses an unrestricted element as a required owner and still checks block modifiers',
		code: `
			.block__title {}

			.block__title--active {}

			.block--compact {}
		`,
		warnings: [
			{ message: messages.detached('.block__title--active', [{ selector: '.block__title', line: 1 }], []) },
			{ message: messages.detached('.block--compact', [{ selector: '.block' }], []) },
		],
	}],
});

testRule({
	description: 'Ordered conditions and unconditional alternatives',
	config: [true, { nesting: {
		element: [{ parent: 'block', when: 'exists' }],
		elementModifier: [{ parent: 'element', when: 'exists' }, 'block'],
		elementModifierValue: [
			{ parent: 'element', when: 'exists' },
			{ parent: 'elementModifier', when: 'exists' },
			'block',
		],
	} }],
	accept: [{
		description: 'Leaves unmatched conditional-only policies unrestricted and applies unconditional fallbacks',
		code: `
			main {
				@at-root .external__title {}
			}

			.block {
				&__title--active {}
			}
		`,
	}],
	reject: [
		{
			description: 'Requires the first active parent even when later parents or fallbacks already own the target',
			code: `
				.block {
					&__title--active {}
					&__title--theme {
						&--dark {}
					}
					&__title {}
				}
			`,
			warnings: [
				{ message: messages.detached('.block__title--active', [{ selector: '.block__title', line: 6 }], []) },
				{ message: messages.detached('.block__title--theme', [{ selector: '.block__title', line: 6 }], []) },
				{ message: messages.detached('.block__title--theme--dark', [{ selector: '.block__title', line: 6 }], []) },
			],
		},
		{
			description: 'Reports a later expansion when its conditional owner becomes mandatory',
			code: `
				.alpha, .beta {
					&__title--active {}
				}

				.beta {
					&__title {}
				}
			`,
			message: messages.detached('.beta__title--active', [{ selector: '.beta__title', line: 6 }], []),
			line: 2, column: 2, endLine: 2, endColumn: 18,
		},
		{
			description: 'Rejects an unrelated selector owner when a fallback requires the block',
			code: `
				main {
					@at-root .block__title--active {}
				}
			`,
			message: messages.detached('.block__title--active', [{ selector: '.block' }], []),
		},
	],
});

const fluidNesting = {
	element: [{ parent: 'block', when: ['exists', 'shared'] }],
	blockModifier: [{ parent: 'block', when: ['exists', 'shared'] }],
	blockModifierValue: [
		{ parent: 'blockModifier', when: ['exists', 'shared'] },
		{ parent: 'block', when: ['exists', 'shared'] },
	],
	elementModifier: [
		{ parent: 'element', when: ['exists', 'shared'] },
		{ parent: 'block', when: ['exists', 'shared'] },
	],
	elementModifierValue: [
		{ parent: 'elementModifier', when: ['exists', 'shared'] },
		{ parent: 'element', when: ['exists', 'shared'] },
		{ parent: 'block', when: ['exists', 'shared'] },
	],
} satisfies SecondaryOption['nesting'];

testRule({
	description: 'Fluid ownership from existing parents and shared structural branches',
	config: [true, { nesting: fluidNesting }],
	accept: [
		{
			description: 'Excludes duplicates, local extensions, other blocks, and relational overrides from shared evidence',
			code: `
				.block__title--theme--dark {
					&:hover {}
				}

				.block__title--theme--dark {}

				.other__title {}

				.layout .block__label {}

				.layout .contextual {
					&--theme--dark {}
				}

				.layout .contextual--theme--light:hover {}
			`,
		},
		{
			description: 'Treats a declared modifier group as one branch under its absent element',
			code: `
				.block__title--theme {
					&--dark {}
					&--light {}
				}
			`,
		},
		{
			description: 'Accepts descendants grouped under each required shared parent',
			code: `
				.block {
					&__title {
						&--large {}
						&--small {}
					}
					&__label {}
				}
			`,
		},
		{
			description: 'Does not impose contextual explicit targets on unconditional declarations',
			code: `
				.block__title--active {}

				:is(.dark, .light) .block__title {}
			`,
		},
	],
	reject: [
		{
			description: 'Requires a block for distinct elements including elements implied by modifiers',
			code: `
				.block__title--active {}

				.block__label--active {}
			`,
			warnings: [
				{ message: messages.detached('.block__title--active', [{ selector: '.block' }], []) },
				{ message: messages.detached('.block__label--active', [{ selector: '.block' }], []) },
			],
		},
		{
			description: 'Groups distinct modifier values without proposing a redundant element or block',
			code: `
				.block__title--theme--dark {}

				.block__title--theme--light {}
			`,
			warnings: [
				{ message: messages.detached('.block__title--theme--dark', [{ selector: '.block__title--theme' }], []) },
				{ message: messages.detached('.block__title--theme--light', [{ selector: '.block__title--theme' }], []) },
			],
		},
		{
			description: 'Includes the element when distinct modifier groups remain after grouping values',
			code: `
				.block__title--size--large {}

				.block__title--size--small {}

				.block__title--theme--dark {}

				.block__title--theme--light {}
			`,
			warnings: ['size--large', 'size--small', 'theme--dark', 'theme--light'].map((modifier) => ({
				message: messages.detached(
					`.block__title--${modifier}`, [{ selector: `.block__title--${modifier.split('--')[0]}` }], [
						{ selector: '.block__title' }, { selector: `.block__title--${modifier.split('--')[0]}` },
					],
				),
			})),
		},
	],
});

testRule({
	description: 'Conditional diagnostics account for newly created ancestors',
	config: [true, { nesting: {
		elementModifier: [
			{ parent: 'block', when: 'exists' },
			'element',
		],
	} }],
	reject: [{
		description: 'Omits an intermediate parent made unnecessary by creating the block',
		code: `
			.block__title--active:hover {}
		`,
		message: messages.detached('.block__title--active:hover', [{ selector: '.block__title--active' }], [
			{ selector: '.block' }, { selector: '.block__title--active' },
		]),
	}],
});


testRule({
	description: 'Ignored structural targets remain shared evidence',
	config: [true, { nesting: { element: [{ parent: 'block', when: 'shared' }] }, ignore: ['.block__legacy'] }],
	reject: [{
		description: 'Requires a shared block for the remaining checked element',
		code: `
			.block__legacy {}

			.block__title {}
		`,
		message: messages.detached('.block__title', [{ selector: '.block' }], []),
	}],
});
