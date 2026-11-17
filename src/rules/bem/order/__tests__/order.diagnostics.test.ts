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
		within: { rules: [
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
