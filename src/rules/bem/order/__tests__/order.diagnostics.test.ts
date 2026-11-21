import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Named rule matcher diagnostics',
	config: [true, {
		order: ['group:children', 'declarations'],
		groups: { children: [{ type: 'rule', selector: /^>/u, name: 'Direct children' }] },
	}],
	reject: [
		{
			description: 'Uses the selected matcher name without extending its source highlight',
			code: `
				.host {
					color: red;
					> span {}
				}
			`,
			fixed: `
				.host {
					> span {}
					color: red
				}
			`,
			warnings: [{
				line: 3, column: 2, endLine: 3, endColumn: 8,
				message: messages.expectedBefore('Direct children', 'color'),
			}],
		},
		{
			description: 'Disambiguates repeated matcher names when referencing an anchor',
			code: `
				.host {
					color: red;
					> span {}
					> em {}
				}
			`,
			fixed: `
				.host {
					> span {}
					> em {}
					color: red
				}
			`,
			warnings: [{ message: messages.expectedAfter('color', 'Direct children (line 4, column 2)') }],
		},
	],
});

testRule({
	description: 'Category-local matcher names',
	config: [true, {
		categories: { rules: [
			{ type: 'rule', selector: 'h1, h2', name: 'Headings' },
			{ type: 'rule', selector: 'p', name: 'Paragraphs' },
		] },
	}],
	reject: [{
		description: 'Names both the moved rule and its anchor using category-local matchers',
		code: `
			p {}
			h1, h2 {}
		`,
		fixed: `
			h1, h2 {}
			p {}
		`,
		warnings: [{ message: messages.expectedBefore('Headings', 'Paragraphs') }],
	}],
});

testRule({
	description: 'Distinct diagnostic labels and crossed anchors',
	config: [true],
	reject: [
		{
			description: 'Distinguishes declaration values and references the nested rule being crossed',
			code: `
				.card {
					color: red;
					& { color: blue; }
					color: green;
				}
			`,
			fixed: `
				.card {
					color: red;
					color: green;
					& { color: blue; }
				}
			`,
			warnings: [{
				line: 4, column: 2, endLine: 4, endColumn: 7,
				message: messages.expectedBefore('color: green', '&'),
			}],
		},
		{
			description: 'Uses original positions for identical values without extending the highlighted property',
			code: `
				.card {
					color: red !important;
					& { color: blue; }
					color: red !important;
				}
			`,
			fixed: `
				.card {
					color: red !important;
					color: red !important;
					& { color: blue; }
				}
			`,
			warnings: [{
				line: 4, column: 2, endLine: 4, endColumn: 7,
				message: messages.expectedBefore('color: red !important (line 4, column 2)', '&'),
			}],
		},
		{
			description: 'Identifies a repeated selector anchor without merging its separate rules',
			code: `
				.card:hover {}
				.card {}
				.card:hover {}
			`,
			fixed: `
				.card {}
				.card:hover {}
				.card:hover {}
			`,
			warnings: [{ message: messages.expectedBefore('.card', '.card:hover (line 1, column 1)') }],
		},
	],
});

testRule({
	description: 'Authored at-rule headers',
	config: [true, {
		categories: { 'at-rules': [
			{ type: 'at-rule', name: 'media', parameter: /^\(min-width:10px\)$/u },
			{ type: 'at-rule', name: 'media', parameter: '(min-width:20px)' },
		] },
	}],
	reject: [
		{
			description: 'Preserves horizontal spacing and comments while matching normalized headers',
			code: `
				@media /* large */ (min-width: 20px) {}
				@media\t /* small */ (min-width:/* size */  10px) /* query */ {}
			`,
			fixed: `
				@media\t /* small */ (min-width:/* size */  10px) /* query */ {}
				@media /* large */ (min-width: 20px) {}
			`,
			warnings: [{
				line: 2, column: 1, endLine: 2, endColumn: 61,
				message: messages.expectedBefore(
					'@media\t /* small */ (min-width:/* size */  10px) /* query */',
					'@media /* large */ (min-width: 20px)',
				),
			}],
		},
		{
			description: 'Keeps multiline headers and highlights their original source range',
			code: `
				@media (min-width: 20px) {}
				@media
				  (min-width: 10px) {}
			`,
			fixed: `
				@media
				  (min-width: 10px) {}
				@media (min-width: 20px) {}
			`,
			warnings: [{
				line: 2, column: 1, endLine: 3, endColumn: 20,
				message: messages.expectedBefore('@media\n  (min-width: 10px)', '@media (min-width: 20px)'),
			}],
		},
	],
});

testRule({
	description: 'Sass variables in media diagnostics',
	config: [true, {
		categories: { 'at-rules': [
			{ type: 'at-rule', name: 'media', parameter: '#{$tablet}' },
			{ type: 'at-rule', name: 'media', parameter: 'screen' },
		] },
	}],
	reject: [{
		description: 'Shows the authored interpolated variable without expanding its media query',
		code: `
			$tablet: '(min-width: 40rem)';
			@media screen {}
			@media #{$tablet} {}
		`,
		fixed: `
			$tablet: '(min-width: 40rem)';
			@media #{$tablet} {}
			@media screen {}
		`,
		warnings: [{
			line: 3, column: 1, endLine: 3, endColumn: 18,
			message: messages.expectedBefore('@media #{$tablet}', '@media screen'),
		}],
	}],
});

testRule({
	description: 'Authored repeated declaration labels',
	config: [true],
	reject: [{
		description: 'Retains declaration spacing and importance spelling while highlighting only the property',
		code: `
			.card {
				color: red;
				& {}
				color:\t  green  !IMPORTANT;
			}
		`,
		fixed: `
			.card {
				color: red;
				color:\t  green  !IMPORTANT;
				& {}
			}
		`,
		warnings: [{
			line: 4, column: 2, endLine: 4, endColumn: 7,
			message: messages.expectedBefore('color:\t  green  !IMPORTANT', '&'),
		}],
	}],
});
