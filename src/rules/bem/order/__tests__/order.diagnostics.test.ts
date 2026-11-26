import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Named group labels',
	config: [true, {
		order: ['group:children', 'declarations'],
		groups: {
			children: {
				order: [{ type: 'rule', selector: /^>/u }],
				label: 'Direct children',
			},
		},
	}],
	reject: [
		{
			description: 'Uses the enclosing group label without extending the source highlight',
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
			description: 'Disambiguates repeated group labels when referencing an anchor',
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
	description: 'Category-local matcher labels',
	config: [true, {
		categories: { rules: [
			{ type: 'rule', selector: 'h1, h2', label: 'Headings' },
			{ type: 'rule', selector: 'p', label: 'Paragraphs' },
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
	description: 'Property and at-rule labels',
	config: [true, {
		order: ['group:layout', { type: 'at-rule', name: 'media', parameter: 'print', label: 'Print styles' }],
		groups: {
			layout: {
				order: [{ properties: ['display', 'gap'], label: 'Layout properties' }],
				label: 'Layout group',
			},
		},
	}],
	reject: [{
		description: 'Uses the property matcher label in preference to the group label',
		code: '.card { @media print {} display: grid; }',
		fixed: '.card { display: grid; @media print {} }',
		warnings: [{ message: messages.expectedBefore('Layout properties', 'Print styles') }],
	}],
});

testRule({
	description: 'Labels across BEM family levels',
	config: [true, {
		root: { order: [{ type: 'rule', selector: '.banner', label: 'Banner' }, 'rules'] },
		categories: { base: { label: 'Base rule' } },
	}],
	reject: [{
		description: 'Keeps an explicit matcher label when its family also has a category label',
		code: '.card {} .banner {}',
		fixed: '.banner {} .card {}',
		warnings: [{ message: messages.expectedBefore('Banner', 'Base rule') }],
	}],
});

testRule({
	description: 'Category labels with inherited ordering',
	config: [true, {
		order: ['css:media'],
		categories: {
			'css:media': { label: 'Media queries' },
			'at-rules': [{ type: 'at-rule', name: 'media', parameter: 'print', label: 'Print' }, '*'],
		},
	}],
	reject: [{
		description: 'Uses the specific category label while inheriting the shared at-rule order',
		code: '.card { @media screen {} @media print {} }',
		fixed: '.card { @media print {} @media screen {} }',
		warnings: [{ message: messages.expectedBefore('Print', 'Media queries') }],
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
