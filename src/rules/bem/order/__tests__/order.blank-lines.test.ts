import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Category spacing with the default root and nested orders',
	config: [true, {
		categories: { 'css:container': { blankLines: { before: 'always', between: 'never' } } },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Separates container queries from media queries and keeps consecutive containers together',
		code: `
			.card {
				@media screen {}
				@container (width > 20rem) {}

				@container (width > 40rem) {}
			}
			@media print {}
			@container sidebar (width > 30rem) {}
		`,
		fixed: `
			.card {
				@media screen {}

				@container (width > 20rem) {}
				@container (width > 40rem) {}
			}
			@media print {}

			@container sidebar (width > 30rem) {}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('@container (width > 20rem)') },
			{ message: messages.unexpectedEmptyLineBefore('@container (width > 40rem)') },
			{ message: messages.expectedEmptyLineBefore('@container sidebar (width > 30rem)') },
		],
	}],
});

testRule({
	description: 'Blank lines before print styles',
	config: [true, {
		root: { order: [
			'css:media',
			{ type: 'at-rule', name: 'media', parameter: 'print', blankLines: { before: 'always' } },
		] },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Adds one gap before the print queries and keeps other media queries together',
		code: `
			@media screen {}
			@media (hover: hover) {}
			@media print {}
			@media print {}
		`,
		fixed: `
			@media screen {}
			@media (hover: hover) {}

			@media print {}
			@media print {}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('@media print') }],
	}],
});

testRule({
	description: 'Rule matcher spacing within a named group',
	config: [true, {
		order: [
			{ properties: ['display'], blankLines: { after: 'never' } },
			'group:states',
			'css:media',
		],
		groups: {
			states: {
				order: [
					{ type: 'rule', relativeSelector: '&:hover' },
					{ type: 'rule', relativeSelector: /^&:focus/u, blankLines: { before: 'always' } },
				],
				blankLines: { before: 'always', between: 'never', after: 'always' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Separates focus states while keeping group spacing at the edges and between matches',
		code: `
			.card {
				display: grid;
				&:hover {}
				&:focus {}

				&:focus-visible {}
				@media print {}
			}
		`,
		fixed: `
			.card {
				display: grid;

				&:hover {}

				&:focus {}
				&:focus-visible {}

				@media print {}
			}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('&:hover') },
			{ message: messages.expectedEmptyLineBefore('&:focus') },
			{ message: messages.unexpectedEmptyLineBefore('&:focus-visible') },
			{ message: messages.expectedEmptyLineAfter('&:focus-visible') },
		],
	}],
});

testRule({
	description: 'Matcher spacing within a category',
	config: [true, {
		categories: {
			'css:media': {
				order: ['*', { type: 'at-rule', parameter: 'print', label: 'Print', blankLines: { between: 'always' } }],
				blankLines: { between: 'never' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Separates consecutive print queries and uses category spacing for the preceding gap',
		code: `
			.card {
				@media screen {}

				@media print {}
				@media print {}
			}
		`,
		fixed: `
			.card {
				@media screen {}
				@media print {}

				@media print {}
			}
		`,
		warnings: [
			{ message: messages.unexpectedEmptyLineBefore('Print') },
			{ message: messages.expectedEmptyLineBefore('Print') },
		],
	}],
});

testRule({
	description: 'Spacing for complete modifier families',
	config: [true, {
		order: ['declarations', 'base', 'bem:modifiers', 'pseudo-classes'],
		categories: { 'bem:modifiers': { blankLines: { before: 'always', between: 'always' } } },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Keeps a modifier with its state and separates the next modifier',
		code: `
			.card {
				display: grid;
				&--small {}
				&--small:hover {}
				&--large {}
			}
		`,
		fixed: `
			.card {
				display: grid;

				&--small {}
				&--small:hover {}

				&--large {}
			}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('&--small') },
			{ message: messages.expectedEmptyLineBefore('&--large') },
		],
	}],
});

testRule({
	description: 'Category formatting across declaration groups',
	config: [true, {
		order: ['custom-properties', 'declarations', 'pseudo-classes'],
		categories: {
			declarations: {
				order: [{ properties: ['display'], blankLines: { after: 'ignore' } }, 'color'],
				unspecified: { position: 'bottom', blankLines: { between: 'always' } },
				blankLines: { before: 'always', between: 'never', after: 'always' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Formats the whole run and gives explicit policies priority at inner boundaries',
		code: `
			.card {
				--gap: 1rem;
				display: grid;

				color: red;

				gap: var(--gap);
				padding: 1rem;
				&:hover {}
			}
		`,
		fixed: `
			.card {
				--gap: 1rem;

				display: grid;

				color: red;
				gap: var(--gap);

				padding: 1rem;

				&:hover {}
			}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('display') },
			{ message: messages.unexpectedEmptyLineBefore('gap') },
			{ message: messages.expectedEmptyLineBefore('padding') },
			{ message: messages.expectedEmptyLineAfter('padding') },
		],
	}],
});

testRule({
	description: 'Compact property groups separated from following declarations',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['display', 'position'], blankLines: { between: 'never', after: 'always' } },
				'color',
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Keeps layout declarations together and separates the following color declaration',
		code: `
			.card {
				display: block;
				position: relative;

				color: red;
			}
		`,
	}],
	reject: [{
		description: 'Removes an inner gap and adds a gap after the complete layout group',
		code: `
			.card {
				display: block;

				position: relative;
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block;
				position: relative;

				color: red;
			}
		`,
		warnings: [
			{ message: messages.unexpectedEmptyLineBefore('position') },
			{ message: messages.expectedEmptyLineAfter('position') },
		],
	}],
});

testRule({
	description: 'Spacing after a group and its attached trailing comment',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['display'], label: 'Layout', blankLines: { after: 'always' } },
				'color',
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Places the gap after the complete unit, including its comment',
		code: `
			.card {
				display: block; /* 📌 Travels with display. */
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block; /* 📌 Travels with display. */

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineAfter('Layout') }],
	}],
});

testRule({
	description: 'Before takes precedence over the previous group after',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['display'], blankLines: { after: 'always' } },
				{ properties: ['color'], blankLines: { before: 'never' } },
				{ properties: ['opacity'], blankLines: { before: 'ignore', between: 'ignore' } },
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Keeps a satisfied before policy and ignored inner gaps unchanged',
		code: `
			.card {
				display: block;
				color: red;
				opacity: .5;

				opacity: .7;
			}
		`,
	}],
	reject: [{
		description: 'Uses before consistently even when after already matches the source',
		code: `
			.card {
				display: block;

				color: red;
				opacity: .5;
			}
		`,
		fixed: `
			.card {
				display: block;
				color: red;
				opacity: .5;
			}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'An explicit ignore suppresses the previous group after',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['display'], blankLines: { after: 'always' } },
				{ properties: ['color'], blankLines: { before: 'ignore' } },
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Preserves a compact boundary',
		code: `
			.card { display: block; color: red; }
		`,
	}, {
		description: 'Preserves an existing gap',
		code: `
			.card {
				display: block;

				color: red;
			}
		`,
	}],
});

testRule({
	description: 'Whitespace inside the opening and closing braces',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['color'], blankLines: { before: 'always', after: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Formats both edges of a nested block',
		code: `
			.card {
				color: red;
			}
		`,
		fixed: `
			.card {

				color: red;

			}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('color') },
			{ message: messages.expectedEmptyLineAfter('color') },
		],
	}],
});

testRule({
	description: 'Removing whitespace before a closing brace',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['color'], blankLines: { after: 'never' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Keeps the closing brace on its own line',
		code: `
			.card {
				color: red;

			}
		`,
		fixed: `
			.card {
				color: red;
			}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineAfter('color') }],
	}],
});

testRule({
	description: 'First and last nested exceptions follow final positions',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['display'],
					blankLines: {
						before: { default: 'always', rules: [{ when: 'first-nested', mode: 'never' }] },
					},
				},
				{
					properties: ['color'],
					blankLines: {
						after: { default: 'always', rules: [{ when: 'last-nested', mode: 'never' }] },
					},
				},
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts declarations without padding the final first and last members',
		code: `
			.card {
				color: red;
				display: block;
			}
		`,
		fixed: `
			.card {
				display: block;
				color: red;
			}
		`,
		warnings: [{ message: messages.expectedBefore('display', 'color') }],
	}],
});

testRule({
	description: 'Root group formatting leaves file padding alone',
	config: [true, {
		root: {
			order: ['group:blocks'],
		},
		groups: {
			blocks: {
				order: ['rules'],
				blankLines: { before: 'always', after: 'always', between: 'always' },
			},
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Preserves more than one empty line between grouped document rules',
		code: `
			.card {}


			.other {}
		`,
	}],
	reject: [{
		description: 'Adds only the gap between document rules',
		code: `
			.card {}
			.other {}
		`,
		fixed: `
			.card {}

			.other {}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('.other') }],
	}],
});

testRule({
	description: 'Conditional policies preserve compact blocks',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['color'],
					blankLines: {
						before: {
							default: 'always',
							rules: [{ when: 'inside-single-line-block', mode: 'ignore' }],
						},
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Ignores spacing in a single-line block',
		code: `
			.icon { display: block; color: red; }
		`,
	}],
	reject: [{
		description: 'Requires the same gap in a multiline block',
		code: `
			.card {
				display: block;
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block;

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'Nested conditions combine disjunction and negation',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['color'],
					blankLines: {
						before: {
							default: 'never',
							rules: [{
								when: {
									all: [
										'first-nested',
										{ not: { any: ['inside-single-line-block', { minItems: 2, scope: 'group' }] } },
									],
								},
								mode: 'always',
							}],
						},
					},
				},
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Requires a gap for a first group with one member in a multiline block',
		code: `
			.card {
				color: red;
			}
		`,
		fixed: `
			.card {

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'The first matching clause can preserve authored spacing',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['color'],
					blankLines: {
						before: {
							default: 'never',
							rules: [
								{ when: 'first-nested', mode: 'ignore' },
								{ when: { minItems: 1, scope: 'container' }, mode: 'always' },
							],
						},
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Preserves an absent gap',
		code: `
			.card {
				color: red;
			}
		`,
	}, {
		description: 'Preserves an existing gap',
		code: `
			.card {

				color: red;
			}
		`,
	}],
});

testRule({
	description: 'Item count thresholds combined with the first nested exception',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['color'],
					blankLines: {
						before: {
							default: 'always',
							rules: [{
								when: { any: ['first-nested', { maxItems: 4, scope: 'container' }] },
								mode: 'never',
							}],
						},
					},
				},
				'*',
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Keeps the group compact at the inclusive maximum of four declarations',
		code: `
			.card {
				display: block;
				color: red;
				width: 1rem;
				height: 1rem;
			}
		`,
	}, {
		description: 'Keeps the first group compact above the maximum item count',
		code: `
			.card {
				color: red;
				width: 1rem;
				height: 1rem;
				opacity: .5;
				visibility: visible;
			}
		`,
	}],
	reject: [{
		description: 'Removes a gap at the inclusive maximum of four declarations',
		code: `
			.card {
				display: block;

				color: red;
				width: 1rem;
				height: 1rem;
			}
		`,
		fixed: `
			.card {
				display: block;
				color: red;
				width: 1rem;
				height: 1rem;
			}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineBefore('color') }],
	}, {
		description: 'Requires a gap when an include brings the container to five items',
		code: `
			.card {
				@include theme;
				display: block;
				color: red;
				width: 1rem;
				height: 1rem;
			}
		`,
		fixed: `
			.card {
				@include theme;
				display: block;

				color: red;
				width: 1rem;
				height: 1rem;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}, {
		description: 'Removes a gap before the first group even at five declarations',
		code: `
			.card {

				color: red;
				width: 1rem;
				height: 1rem;
				opacity: .5;
				visibility: visible;
			}
		`,
		fixed: `
			.card {
				color: red;
				width: 1rem;
				height: 1rem;
				opacity: .5;
				visibility: visible;
			}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'Container thresholds count direct items in the authored source',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['color'],
					blankLines: {
						before: {
							default: 'never',
							rules: [{ when: { minItems: 5, scope: 'container' }, mode: 'always' }],
						},
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Stays below five with four items, an attached comment and declarations inside hover',
		code: `
			.card {
				$theme: red;
				display: block;
				/* 📌 This comment belongs to color. */
				color: red;
				&:hover { opacity: .5; visibility: visible; }
			}
		`,
	}],
	reject: [{
		description: 'Counts a Sass variable, a custom property, two declarations and a nested rule as five items',
		code: `
			.card {
				$theme: red;
				--theme: red;
				display: block;
				color: red;
				&:hover { opacity: .5; }
			}
		`,
		fixed: `
			.card {
				$theme: red;
				--theme: red;
				display: block;

				color: red;
				&:hover { opacity: .5; }
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'A group of custom properties can satisfy an item threshold',
	config: [true, {
		order: [
			'custom-properties',
			{
				properties: ['color'],
				blankLines: {
					before: { rules: [{ when: { minItems: 2, scope: 'previous-group' }, mode: 'always' }] },
				},
			},
		],
	} satisfies SecondaryOption],
	accept: [{
		description: 'Counts a custom property and its comment as one item',
		code: `
			.card {
				--text: red; /* 📌 The default text color. */
				color: var(--text);
			}
		`,
	}],
	reject: [{
		description: 'Adds a gap after two custom properties',
		code: `
			.card {
				--text: red;
				--surface: white;
				color: var(--text);
			}
		`,
		fixed: `
			.card {
				--text: red;
				--surface: white;

				color: var(--text);
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'Omitting scope counts the properties in the group itself',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['width', 'height'],
					blankLines: {
						before: { rules: [{ when: { minItems: 2 }, mode: 'always' }] },
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Leaves the gap alone when only width is present',
		code: `
			.card {
				display: block;
				width: 4rem;
			}
		`,
	}],
	reject: [{
		description: 'Adds a gap before width when both width and height are present',
		code: `
			.card {
				display: block;
				width: 4rem;
				height: 2rem;
			}
		`,
		fixed: `
			.card {
				display: block;

				width: 4rem;
				height: 2rem;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('width') }],
	}],
});

testRule({
	description: 'A before policy can count properties in the previous group',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['width', 'height'],
					blankLines: {
						before: { rules: [{ when: { maxItems: 1, scope: 'previous-group' }, mode: 'always' }] },
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'A missing previous group does not satisfy the maximum',
		code: `
			.card {
				width: 4rem;
				height: 2rem;
			}
		`,
	}],
	reject: [{
		description: 'Adds a gap after the one-property display group',
		code: `
			.card {
				display: block;
				width: 4rem;
				height: 2rem;
			}
		`,
		fixed: `
			.card {
				display: block;

				width: 4rem;
				height: 2rem;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('width') }],
	}],
});

testRule({
	description: 'The next group can be a plain declarations category',
	config: [true, {
		order: [
			{
				properties: ['display'],
				blankLines: {
					after: { rules: [{ when: { minItems: 2, scope: 'next-group' }, mode: 'always' }] },
				},
			},
			'declarations',
		],
	} satisfies SecondaryOption],
	reject: [{
		description: 'Counts color and opacity together after display',
		code: `
			.card {
				display: block;
				color: red;
				opacity: .5;
			}
		`,
		fixed: `
			.card {
				display: block;

				color: red;
				opacity: .5;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineAfter('display') }],
	}],
});

testRule({
	description: 'An explicit property group defines a narrower neighbor within declarations',
	config: [true, {
		order: [
			{
				properties: ['display'],
				blankLines: {
					after: { rules: [{ when: { minItems: 2, scope: 'next-group' }, mode: 'always' }] },
				},
			},
			'declarations',
		],
		categories: {
			declarations: [{ properties: ['width', 'height'] }, '*'],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Stops at the end of the explicit width and height group when only width is present',
		code: `
			.card {
				display: block;
				width: 4rem;
				color: red;
			}
		`,
	}],
});

testRule({
	description: 'An implicit unspecified group can follow an explicit property group',
	config: [true, {
		order: [{
			properties: ['display'],
			blankLines: {
				after: { rules: [{ when: { minItems: 2, scope: 'next-group' }, mode: 'always' }] },
			},
		}],
	} satisfies SecondaryOption],
	reject: [{
		description: 'Counts both unspecified declarations without configuring unspecified',
		code: `
			.card {
				display: block;
				color: red;
				opacity: .5;
			}
		`,
		fixed: `
			.card {
				display: block;

				color: red;
				opacity: .5;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineAfter('display') }],
	}],
});

testRule({
	description: 'A category-local unspecified group can precede an explicit property group',
	config: [true, {
		categories: {
			declarations: {
				unspecified: 'top',
				order: [{
					properties: ['color'],
					blankLines: {
						before: { rules: [{ when: { minItems: 2, scope: 'previous-group' }, mode: 'always' }] },
					},
				}],
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Counts both unspecified declarations before color',
		code: `
			.card {
				width: 4rem;
				height: 2rem;
				color: red;
			}
		`,
		fixed: `
			.card {
				width: 4rem;
				height: 2rem;

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'An after policy can count properties in the next group',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['width', 'height'],
					blankLines: {
						after: { rules: [{ when: { maxItems: 1, scope: 'next-group' }, mode: 'never' }] },
					},
				},
				{ properties: ['color', 'opacity'] },
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Preserves the gap when the next group contains both color and opacity',
		code: `
			.card {
				width: 4rem;
				height: 2rem;

				color: red;
				opacity: .5;
			}
		`,
	}],
	reject: [{
		description: 'Removes the gap when the next group contains only color',
		code: `
			.card {
				width: 4rem;
				height: 2rem;

				color: red;
			}
		`,
		fixed: `
			.card {
				width: 4rem;
				height: 2rem;
				color: red;
			}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineAfter('height') }],
	}],
});

testRule({
	description: 'A leading comment can separate property groups',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{
					properties: ['color'],
					blankLines: {
						before: { default: 'always', rules: [{ when: 'separated-by-comment', mode: 'ignore' }] },
					},
				},
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Accepts a standalone comment as the only separator',
		code: `
			.card {
				display: block;
				/* 📌 This line separates the groups. */
				color: red;
			}
		`,
	}, {
		description: 'Preserves an existing blank line before a standalone comment',
		code: `
			.card {
				display: block;

				/* 📌 Both separators can stay. */
				color: red;
			}
		`,
	}],
	reject: [{
		description: 'Requires a blank line after a trailing comment',
		code: `
			.card {
				display: block; /* 📌 Shares the display line. */
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block; /* 📌 Shares the display line. */

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}, {
		description: 'Requires a blank line when the leading comment shares the next declaration line',
		code: `
			.card {
				display: block;
				/* 📌 Shares the color line. */ color: red;
			}
		`,
		fixed: `
			.card {
				display: block;

				/* 📌 Shares the color line. */ color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'The after policy inspects comments on the following group',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['display'],
					blankLines: {
						after: { default: 'always', rules: [{ when: 'separated-by-comment', mode: 'never' }] },
					},
				},
				'color',
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Removes the extra blank line before the comment in the final order',
		code: `
			.card {
				/* 📌 Text color
				   on a light background. */
				color: red;

				display: block;
			}
		`,
		fixed: `
			.card {
				display: block;
				/* 📌 Text color
				   on a light background. */
				color: red;
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('display', 'color') },
			{ message: messages.unexpectedEmptyLineAfter('display') },
		],
	}],
});

testRule({
	description: 'Standalone comments at the start of a group and between its members',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['color', 'opacity'],
					blankLines: {
						before: { default: 'always', rules: [{ when: 'separated-by-comment', mode: 'never' }] },
						between: { default: 'always', rules: [{ when: 'separated-by-comment', mode: 'never' }] },
					},
				},
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Places the opening comment on its own line and removes the extra gap before a Sass comment',
		code: `
			.card { /* 📌 Text color. */
				color: red;

				// 📌 This line separates the group members.
				opacity: .5;
			}
		`,
		fixed: `
			.card {
				/* 📌 Text color. */
				color: red;
				// 📌 This line separates the group members.
				opacity: .5;
			}
		`,
		warnings: [
			{ message: messages.expectedCommentOnOwnLine('color') },
			{ message: messages.unexpectedEmptyLineBefore('opacity') },
		],
	}],
});

testRule({
	description: 'Blank lines before a group with comments on either side of the gap',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{ properties: ['color'], label: 'Text', blankLines: { before: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Inserts the gap after the inline comment attached to the previous declaration',
		code: `
			.card {
				display: block; /* 📌 This comment belongs to display. */
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block; /* 📌 This comment belongs to display. */

				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('Text') }],
	}, {
		description: 'Inserts the gap before the leading comment attached to the next declaration',
		code: `
			.card {
				display: block;
				/* 📌 This comment belongs to color. */
				color: red;
			}
		`,
		fixed: `
			.card {
				display: block;

				/* 📌 This comment belongs to color. */
				color: red;
			}
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('Text') }],
	}],
});

testRule({
	description: 'Semantic parent scopes own cross-family spacing',
	config: [true, {
		root: {
			order: ['group:blocks'],
		},
		order: ['group:bases', 'group:blocks'],
		groups: {
			bases: {
				order: ['base'],
				blankLines: { before: 'always' },
			},
			blocks: {
				order: ['rules'],
				blankLines: { between: 'never' },
			},
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Does not apply inner before at a document boundary',
		code: `
			.card {}
			.other {}
		`,
	}],
	reject: [{
		description: 'Removes the parent gap without a descendant adding it back on the next lint',
		code: `
			.card {}

			.other {}
		`,
		fixed: `
			.card {}
			.other {}
		`,
		warnings: [{ message: messages.unexpectedEmptyLineBefore('.other') }],
	}],
});

testRule({
	description: 'Protected boundaries keep their authored spacing',
	config: [true, {
		categories: {
			declarations: [
				{ properties: ['display'], blankLines: { after: 'always' } },
				{ properties: ['color'], blankLines: { before: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Does not format across a disabled range or a Sass control rule',
		code: `
			.card {
				display: block;
				/* stylelint-disable @morev/bem/order */
				color: red;
				/* stylelint-enable @morev/bem/order */
				@if $theme { $accent: red; }
				color: red;
			}
		`,
	}],
});

testRule({
	description: 'Single-line conditions use the complete planned container layout',
	config: [true, {
		categories: {
			declarations: [
				{
					properties: ['display'],
					blankLines: {
						after: {
							default: 'always',
							rules: [{ when: 'inside-single-line-block', mode: 'ignore' }],
						},
					},
				},
				'position',
				{ properties: ['color'], blankLines: { before: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Applies both gaps in one fix when another policy expands the block',
		code: `
			.card { display: block; position: relative; color: red; }
		`,
		fixed: `
			.card { display: block;

			 position: relative;

			 color: red; }
		`,
		warnings: [
			{ message: messages.expectedEmptyLineAfter('display') },
			{ message: messages.expectedEmptyLineBefore('color') },
		],
	}],
});

testRule({
	description: 'Nested formatting expands the ancestor layout',
	config: [true, {
		order: ['group:variables', 'declarations', '*'],
		groups: {
			variables: {
				order: ['custom-properties'],
				blankLines: {
					after: {
						default: 'always',
						rules: [{ when: 'inside-single-line-block', mode: 'ignore' }],
					},
				},
			},
		},
		categories: {
			declarations: [
				'color',
				{ properties: ['opacity'], blankLines: { before: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Resolves an ancestor single-line condition after planning a descendant gap',
		code: `
			.card { --theme: red; color: red; &:hover { color: blue; opacity: .5; } }
		`,
		fixed: `
			.card { --theme: red;

			 color: red; &:hover { color: blue;

			 opacity: .5; } }
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('opacity') },
			{ message: messages.expectedEmptyLineAfter('--theme') },
		],
	}],
});

testRule({
	description: 'Invalid conditional spacing',
	config: [true, {
		categories: {
			declarations: [{
				properties: ['color'],
				blankLines: {
					before: {
						default: 'never',
						rules: [{ when: 'inside-single-line-block', mode: 'always' }],
					},
				},
			}],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Reports a policy whose required gap would invalidate its own condition',
		code: '.card { color: red; }',
		fixed: '.card { color: red; }',
		warnings: [],
		invalidOptionWarnings: [/require a gap only while the block is on one line/u],
	}],
});

testRule({
	description: 'Independent formatting for unmatched root and nested items',
	config: [true, {
		root: { order: ['rules'] },
		order: ['declarations'],
		unspecified: { position: 'top', blankLines: { after: 'always' } },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Applies the nested position and blank lines only inside the selector',
		code: `
			.card {
				color: red;
				--theme: red;
			}
			@media print {}
		`,
		fixed: `
			.card {
				--theme: red;

				color: red;
			}
			@media print {}
		`,
		warnings: [
			{ message: messages.expectedBefore('--theme', 'color') },
			{ message: messages.expectedEmptyLineAfter('--theme') },
		],
	}],
});

testRule({
	description: 'Root unmatched group formatting',
	config: [true, {
		root: {
			order: ['at-rules'],
			unspecified: { position: 'bottom', blankLines: { before: 'always', between: 'always' } },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Formats unmatched document rules as a group without adding file padding',
		code: `
			@media (hover: hover) {}
			.card {}
			.other {}
		`,
		fixed: `
			@media (hover: hover) {}

			.card {}

			.other {}
		`,
		warnings: [
			{ message: messages.expectedEmptyLineBefore('.card') },
			{ message: messages.expectedEmptyLineBefore('.other') },
		],
	}],
});

testRule({
	description: 'Conditional blank lines before unspecified declarations',
	config: [true, {
		categories: {
			declarations: {
				order: ['display'],
				unspecified: {
					position: 'bottom',
					blankLines: {
						before: {
							default: 'never',
							rules: [{ when: { minItems: 2, scope: 'container' }, mode: 'always' }],
						},
					},
				},
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Expands a single-line block when a custom property and its use reach the two-item threshold',
		code: '.icon { --color: red; color: var(--color); }',
		fixed: `
			.icon { --color: red;

			 color: var(--color); }
		`,
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});

testRule({
	description: 'An explicit remainder stays outside unmatched formatting',
	config: [true, {
		categories: {
			declarations: {
				order: ['display', '*'],
				unspecified: { position: 'bottom', blankLines: { before: 'always', between: 'always' } },
			},
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Does not apply unspecified policies to wildcard-selected properties',
		code: `
			.card {
				display: block;
				color: red;
				opacity: .5;
			}
		`,
	}],
});

testRule({
	description: 'Spacing retains authored newline style',
	config: [true, {
		categories: {
			declarations: [
				'display',
				{ properties: ['color'], blankLines: { before: 'always' } },
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Inserts a CRLF gap with the existing indentation',
		code: '.card {\r\n  display: block;\r\n  color: red;\r\n}',
		fixed: '.card {\r\n  display: block;\r\n\r\n  color: red;\r\n}',
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}, {
		description: 'Preserves a local LF between declarations in a file with CRLF',
		code: '.card {\r\n  display: block;\n  color: red;\r\n}',
		fixed: '.card {\r\n  display: block;\n\n  color: red;\r\n}',
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}, {
		description: 'Uses the sibling indentation when moving an inline declaration to a new line',
		code: '.card {\r\n  display: block; color: red;\r\n}',
		fixed: '.card {\r\n  display: block;\r\n\r\n  color: red;\r\n}',
		warnings: [{ message: messages.expectedEmptyLineBefore('color') }],
	}],
});
