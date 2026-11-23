import rule from '../order';
import type { CategorySequence } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default ordering and boundaries',
	config: [true],
	accept: [{
		description: 'Preserves disabled ranges, ambiguous selectors, and Sass control flow',
		code: `
			.card:active {}

			// 📌 The disabled range keeps the surrounding states in separate regions.
			/* stylelint-disable @morev/bem/order */
			.card:active {}
			.card:hover {}
			/* stylelint-enable @morev/bem/order */
			.card:hover {}

			// 📌 Different block owners make this list a boundary.
			.card, .button {}
			.card {}

			// 📌 Neither class can be selected as the unique owner.
			.unknown.other {}
			.card:hover {}

			// 📌 An unresolved selector also separates sorting regions.
			#{$unknown} {}
			.card {}

			// 📌 Flow-control branches stay in their authored order.
			@if $enabled {
				.card {}
			}
			@else {
				.button {}
			}
		`,
	}],
	reject: [
		{
			description: 'Keeps flat block, element, and modifier families in first-appearance order',
			code: `
				.card__title--large:hover {} // 📌 The card and title families appear first.

				.button {} // 📌 This block follows the complete card family.

				.card__icon {}

				.card__title--large {} // 📌 The modifier base precedes its own state.

				.card {} // 📌 The block base precedes its descendants.

				.card__title {} // 📌 The element base precedes its modifier family.
			`,
			fixed: `
				.card {} // 📌 The block base precedes its descendants.

				.card__title {} // 📌 The element base precedes its modifier family.

				.card__title--large {} // 📌 The modifier base precedes its own state.

				.card__title--large:hover {} // 📌 The card and title families appear first.

				.card__icon {}

				.button {} // 📌 This block follows the complete card family.
			`,
			warnings: [
				{
					line: 9, column: 1,
					message: messages.expectedGroupBefore('rules ".card", ".card__title"', '.card__title--large:hover'),
				},
				{
					line: 7, column: 1,
					message: messages.expectedBefore('.card__title--large', '.card__title--large:hover'),
				},
				{ line: 5, column: 1, message: messages.expectedBefore('.card__icon', '.button') },
			],
		},
		{
			description: 'Places the list marker before generated content by default',
			code: `
				.list__item::before {}
				.list__item::after {}
				.list__item::marker {}
				.list__item::selection {}
			`,
			fixed: `
				.list__item::marker {}
				.list__item::before {}
				.list__item::after {}
				.list__item::selection {}
			`,
			warnings: [{ message: messages.expectedBefore('.list__item::marker', '.list__item::before') }],
		},
		{
			description: 'Keeps pseudo-element states with their family and resolves Sass references',
			code: `
				.card {
					$state: hover;

					&:hover::after {} // 📌 This state stays in the after family.

					&:#{$state}::before {} // 📌 Interpolation resolves to a before-family state.

					&::after {}

					&::before {}

					&:hover {} // 📌 The block state precedes pseudo-element families.
				}
			`,
			fixed: `
				.card {
					$state: hover;

					&:hover {} // 📌 The block state precedes pseudo-element families.

					&::before {}

					&:#{$state}::before {} // 📌 Interpolation resolves to a before-family state.

					&::after {}

					&:hover::after {} // 📌 This state stays in the after family.
				}
			`,
			warnings: [
				{ message: messages.expectedBefore('&:hover', '&:#{$state}::before') },
				{ message: messages.expectedBefore('&::before', '&:#{$state}::before') },
				{ message: messages.expectedAfter('&:hover::after', '&::after') },
			],
		},
		{
			description: 'Fixes independent regions without crossing a disabled nested rule',
			code: `
				.card {
					&:active {}
					&:hover {} // 📌 This region sorts before the disabled rule.

					/* stylelint-disable-next-line @morev/bem/order */
					&:visited {} // 📌 This rule stays fixed and cannot be crossed.

					&:active {}
					&:hover {} // 📌 This region sorts independently after it.
				}
			`,
			fixed: `
				.card {
					&:hover {} // 📌 This region sorts before the disabled rule.
					&:active {}

					/* stylelint-disable-next-line @morev/bem/order */
					&:visited {} // 📌 This rule stays fixed and cannot be crossed.

					&:hover {} // 📌 This region sorts independently after it.
					&:active {}
				}
			`,
			warnings: [
				{ line: 3, column: 2, message: messages.expectedBefore('&:hover', '&:active') },
				{ line: 9, column: 2, message: messages.expectedBefore('&:hover', '&:active') },
			],
		},
	],
});

testRule({
	description: 'Property order and attached comments',
	config: [true, { categories: { declarations: ['display', '*'] } }],
	reject: [{
		description: 'Sorts nested content and moves leading and trailing comments with their rule',
		code: `
			.card {
				&:active {}

				// 📌 The leading comment travels with hover.
				&:hover {} // 📌 The trailing comment travels with it too.
				color: red;
				display: block; // 📌 Explicit property priorities precede nested rules.
			}
		`,
		fixed: `
			.card {
				display: block; // 📌 Explicit property priorities precede nested rules.
				color: red;

				// 📌 The leading comment travels with hover.
				&:hover {} // 📌 The trailing comment travels with it too.
				&:active {}
			}
		`,
		warnings: [
			{ line: 7, column: 2, message: messages.expectedBefore('display', '&:active') },
			{ line: 6, column: 2, message: messages.expectedBefore('color', '&:active') },
			{ line: 5, column: 2, message: messages.expectedBefore('&:hover', '&:active') },
		],
	}, {
		description: 'Moves leading and trailing single-line CSS comments with their rules and declarations',
		code: `
			.card {
				&:active {}

				/* 📌 The leading CSS comment travels with hover. */
				&:hover {} /* 📌 The trailing CSS comment travels with it too. */
				color: red;
				display: block; /* 📌 This CSS comment belongs to the declaration. */
			}
		`,
		fixed: `
			.card {
				display: block; /* 📌 This CSS comment belongs to the declaration. */
				color: red;

				/* 📌 The leading CSS comment travels with hover. */
				&:hover {} /* 📌 The trailing CSS comment travels with it too. */
				&:active {}
			}
		`,
		warnings: [
			{ line: 7, column: 2, message: messages.expectedBefore('display', '&:active') },
			{ line: 6, column: 2, message: messages.expectedBefore('color', '&:active') },
			{ line: 5, column: 2, message: messages.expectedBefore('&:hover', '&:active') },
		],
	}, {
		description: 'Preserves multiline leading and trailing CSS comments while moving their rule',
		code: `
			.card {
				&:active {}

				/*
				 * 📌 This leading block travels with hover.
				 * Its line breaks and indentation remain intact.
				 */
				&:hover {} /*
				 * 📌 This trailing block belongs to hover too.
				 */
				color: red;
				display: block;
			}
		`,
		fixed: `
			.card {
				display: block;
				color: red;

				/*
				 * 📌 This leading block travels with hover.
				 * Its line breaks and indentation remain intact.
				 */
				&:hover {} /*
				 * 📌 This trailing block belongs to hover too.
				 */
				&:active {}
			}
		`,
		warnings: [
			{ line: 12, column: 2, message: messages.expectedBefore('display', '&:active') },
			{ line: 11, column: 2, message: messages.expectedBefore('color', '&:active') },
			{ line: 8, column: 2, message: messages.expectedBefore('&:hover', '&:active') },
		],
	}],
	accept: [{
		description: 'Keeps a multiline section comment detached when followed by a blank line',
		code: `
			.card {
				&:active {}

				/*
				 * 📌 This comment separates sorting regions.
				 * The following blank line prevents attachment to hover.
				 */

				&:hover {}
			}
		`,
	}],
});

testRule({
	description: 'Context ownership',
	config: [true, { order: ['context:external', 'base', 'pseudo-classes', 'context:internal', 'elements'] }],
	reject: [{
		description: 'Groups contextual variants by their target and allows context before base',
		code: `
			.card__title {} // 📌 The element base can follow an external context.

			.theme .card--compact .card__title:hover {}

			.card--compact.is-active .card__title:hover {}

			.card--compact[data-open] .card__title:hover {}

			.card--compact[data-open] .card__title {} // 📌 Only the card block provides this context.

			.theme.card--compact .card__title {} // 📌 An extra class on the same block stays internal.
			.card--compact.theme .card__title {} // 📌 Reversing the ancestor classes stays internal.

			.theme .card--compact .card__title {} // 📌 A separate foreign ancestor makes this external.

			.card--compact.is-active .card__title {} // 📌 The state class qualifies the block ancestor.
		`,
		fixed: `
			.theme .card--compact .card__title {} // 📌 A separate foreign ancestor makes this external.

			.theme .card--compact .card__title:hover {}

			.card__title {} // 📌 The element base can follow an external context.

			.card--compact.is-active .card__title {} // 📌 The state class qualifies the block ancestor.

			.card--compact.is-active .card__title:hover {}

			.card--compact[data-open] .card__title {} // 📌 Only the card block provides this context.

			.card--compact[data-open] .card__title:hover {}

			.theme.card--compact .card__title {} // 📌 An extra class on the same block stays internal.
			.card--compact.theme .card__title {} // 📌 Reversing the ancestor classes stays internal.
		`,
		warnings: [
			{ message: messages.expectedBefore('.theme .card--compact .card__title', '.card__title') },
			{
				message: messages.expectedBefore(
					'.theme .card--compact .card__title:hover', '.card__title',
				),
			},
			{
				message: messages.expectedBefore(
					'.card--compact.is-active .card__title', '.card--compact.is-active .card__title:hover',
				),
			},
			{
				message: messages.expectedBefore(
					'.card--compact[data-open] .card__title', '.card--compact[data-open] .card__title:hover',
				),
			},
		],
	}],
});

testRule({
	description: 'Object priority and equal ranks',
	config: [true, {
		order: ['group:children', ['pseudo-classes', 'qualifiers:attribute'], 'group:structural'],
		groups: {
			children: [{ type: 'rule', selector: '> *' }],
			structural: [{ type: 'rule', relativeSelector: '&:empty' }],
		},
	}],
	reject: [{
		description: 'Prioritizes object matchers, expands groups, and retains equal ranks',
		code: `
			.card {
				&:empty {} // 📌 The explicit structural matcher wins over the state category.

				&:focus-visible {} // 📌 This has equal local priority with focus.

				&[data-open] {} // 📌 Equal outer ranks keep this category's slot separate.

				&:focus {}

				&:hover {}

				> * {} // 📌 The explicit children group comes first.
			}
		`,
		fixed: `
			.card {
				> * {} // 📌 The explicit children group comes first.

				&:hover {}

				&[data-open] {} // 📌 Equal outer ranks keep this category's slot separate.

				&:focus-visible {} // 📌 This has equal local priority with focus.

				&:focus {}

				&:empty {} // 📌 The explicit structural matcher wins over the state category.
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('> *', '&:focus-visible') },
			{ message: messages.expectedBefore('&:hover', '&:focus-visible') },
			{ message: messages.expectedBefore('&[data-open]', '&:focus-visible') },
			{ message: messages.expectedAfter('&:empty', '&:focus') },
		],
	}],
});

testRule({
	description: 'Overlapping at-rule matchers',
	config: [true, {
		order: [
			'css:media',
			{ type: 'at-rule', name: 'media' },
			{ type: 'at-rule', name: 'media', parameter: /^p/u },
			'group:print',
		],
		root: { order: ['group:print', { type: 'at-rule', name: 'media' }] },
		groups: { print: [{ type: 'at-rule', name: 'media', parameter: 'print', label: 'Print' }] },
	}],
	reject: [
		{
			description: 'Uses the original slots of the generic, pattern and exact matchers',
			code: '.card { @media print {} @media projection {} @media screen {} }',
			fixed: '.card { @media screen {} @media projection {} @media print {} }',
			warnings: [
				{ message: messages.expectedBefore('@media screen', 'Print') },
				{ message: messages.expectedBefore('@media projection', 'Print') },
			],
		},
		{
			description: 'Places print first when its group comes before the broad matcher at the root',
			code: '@media screen {} @media print {}',
			fixed: '@media print {} @media screen {}',
			warnings: [{ message: messages.expectedBefore('Print', '@media screen') }],
		},
	],
});

testRule({
	description: 'Incomparable at-rule constraints',
	config: [true, {
		order: [
			{ type: 'at-rule', name: 'media' },
			{ type: 'at-rule', hasBlock: true, label: 'Blocks' },
			'declarations',
			// 📌 A refinement must preserve every constraint of the other matcher, regardless of field count.
			// Adding `parameter` refines the `media` matcher. It leaves `hasBlock` open, so `Blocks` wins by order.
			{ type: 'at-rule', name: 'media', parameter: 'print' },
		],
	}],
	reject: [{
		description: 'Chooses the first remaining match after a later object refines the first candidate',
		code: '.card { color: red; @media print {} }',
		fixed: '.card { @media print {} color: red }',
		warnings: [{ message: messages.expectedBefore('Blocks', 'color') }],
	}],
});

testRule({
	description: 'Overlapping selectors at an equal rank',
	config: [true, {
		root: {
			order: [
				[
					{ type: 'rule' },
					{ type: 'rule', selector: /^h/u, label: 'Starts with h' },
					{ type: 'rule', selector: /^h[1-6]$/u, label: 'Numbered heading' },
					{ type: 'rule', selector: 'h1', label: 'Heading' },
				],
				'at-rules',
			],
		},
	}],
	reject: [
		{
			description: 'Uses the exact selector label within the shared slot',
			code: '@media print {} h1 {}',
			fixed: 'h1 {} @media print {}',
			warnings: [{ message: messages.expectedBefore('Heading', '@media print') }],
		},
		{
			description: 'Uses the first of two different matching selector patterns',
			code: '@media print {} h2 {}',
			fixed: 'h2 {} @media print {}',
			warnings: [{ message: messages.expectedBefore('Starts with h', '@media print') }],
		},
	],
});

testRule({
	description: 'Category overrides',
	config: [true, {
		categories: {
			'sass:variables': (defaults: CategorySequence) => [/^\$_/u, ...defaults],
			'at-rules': [
				{ type: 'at-rule', name: 'include', hasBlock: false },
				{ type: 'at-rule', name: 'include', hasBlock: true },
				// 📌 Whitespace in '( --tablet )' below does not affect matching.
				{ type: 'at-rule', name: 'media', parameter: '(--tablet)' },
				{ type: 'at-rule', name: 'supports' },
			],
		},
	}],
	reject: [{
		description: 'Transforms defaults and orders at-rule forms within independent regions',
		code: `
			.card {
				$public: 1;
				$_private: 2; // 📌 The added matcher places private variables first.

				@supports (display: grid) {
					&:active {}
					&:hover {} // 📌 Nested states still use their own ordering defaults.
				}

				@media ( --tablet ) {
					&:active {}
					&:hover {}
				}

				@include content {} // 📌 Block includes precede media and supports.

				@include plain; // 📌 Plain includes precede the other at-rules.
			}
		`,
		fixed: `
			.card {
				$_private: 2; // 📌 The added matcher places private variables first.
				$public: 1;

				@include plain; // 📌 Plain includes precede the other at-rules.

				@include content {} // 📌 Block includes precede media and supports.

				@media ( --tablet ) {
					&:hover {}
					&:active {}
				}

				@supports (display: grid) {
					&:hover {} // 📌 Nested states still use their own ordering defaults.
					&:active {}
				}
			}
		`,
		warnings: [
			{ line: 7, message: messages.expectedBefore('&:hover', '&:active') },
			{ line: 12, message: messages.expectedBefore('&:hover', '&:active') },
			{ line: 3, message: messages.expectedBefore('$_private', '$public') },
			{ line: 17, message: messages.expectedBefore('@include plain', '@supports (display: grid)') },
			{ line: 15, message: messages.expectedBefore('@include content', '@supports (display: grid)') },
			{ line: 10, message: messages.expectedBefore('@media ( --tablet )', '@supports (display: grid)') },
		],
	}],
});

testRule({
	description: 'Custom separators',
	config: [true, { separators: { modifier: '_', modifierValue: '_' } }],
	reject: [{
		description: 'Uses custom separators and distinguishes local qualifiers from context',
		code: `
			.card__title[data-open] {} // 📌 Attribute qualifiers come after class qualifiers.

			.card__title.active {} // 📌 This class qualifies the title instead of creating a context.

			.card__title_size_large:hover {} // 📌 This state stays with the size modifier value.

			.card__title_size_large {} // 📌 Underscores separate the modifier name and value.

			.card__title {} // 📌 The element base precedes the modifier and qualifiers.
		`,
		fixed: `
			.card__title {} // 📌 The element base precedes the modifier and qualifiers.

			.card__title_size_large {} // 📌 Underscores separate the modifier name and value.

			.card__title_size_large:hover {} // 📌 This state stays with the size modifier value.

			.card__title.active {} // 📌 This class qualifies the title instead of creating a context.

			.card__title[data-open] {} // 📌 Attribute qualifiers come after class qualifiers.
		`,
		warnings: [
			{ message: messages.expectedBefore('.card__title', '.card__title[data-open]') },
			{ message: messages.expectedBefore('.card__title_size_large', '.card__title[data-open]') },
			{ message: messages.expectedBefore('.card__title_size_large:hover', '.card__title[data-open]') },
			{ message: messages.expectedBefore('.card__title.active', '.card__title[data-open]') },
		],
	}],
});

testRule({
	description: 'Minimal relocations',
	config: [true, { categories: { declarations: ['display', 'position', 'inset', 'color', 'opacity'] } }],
	reject: [
		{
			description: 'Moves one contiguous run instead of reporting every shifted declaration',
			code: `
				.card {
					color: red;
					opacity: .5; // 📌 These two declarations move together as one run.

					display: block;
					position: relative;
					inset: 0;
				}
			`,
			fixed: `
				.card {
					display: block;
					position: relative;
					inset: 0;

					color: red;
					opacity: .5; // 📌 These two declarations move together as one run.
				}
			`,
			warnings: [{
				line: 2, column: 2,
				message: messages.expectedGroupAfter('declarations "color", "opacity"', 'inset'),
			}],
		},
		{
			description: 'Chooses fewer diagnostics among plans that move the same minimum number of nodes',
			code: `
				.card {
					inset: 0;
					opacity: .5; // 📌 Color must precede opacity independently of the larger move.
					color: red;

					display: block; // 📌 Display and position form one contiguous move.
					position: relative;
				}
			`,
			fixed: `
				.card {
					display: block; // 📌 Display and position form one contiguous move.
					position: relative;

					inset: 0;
					color: red;
					opacity: .5; // 📌 Color must precede opacity independently of the larger move.
				}
			`,
			warnings: [
				{
					line: 6, column: 2,
					message: messages.expectedGroupBefore('declarations "display", "position"', 'inset'),
				},
				{ line: 4, column: 2, message: messages.expectedBefore('color', 'opacity') },
			],
		},
	],
});
