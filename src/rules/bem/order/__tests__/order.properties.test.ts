import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

const equalRankGroups = [
	{ properties: ['display', 'position'] },
	{ properties: ['color', 'opacity'] },
];

testRule({
	description: 'Outer equal-rank property groups',
	config: [true, {
		order: [equalRankGroups, '*'],
	} satisfies SecondaryOption],
	reject: [{
		description: 'Keeps each property group independent within a shared rank',
		code: '.card { position: relative; opacity: .5; display: block; color: red; }',
		fixed: '.card { display: block; color: red; position: relative; opacity: .5; }',
		warnings: [{ message: messages.expectedGroupBefore('declarations "display", "color"', 'position') }],
	}],
});

testRule({
	description: 'Category-local equal-rank property groups',
	config: [true, {
		categories: {
			declarations: [equalRankGroups, '*'],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Keeps each property group independent within a shared rank',
		code: '.card { position: relative; opacity: .5; display: block; color: red; }',
		fixed: '.card { display: block; color: red; position: relative; opacity: .5; }',
		warnings: [{ message: messages.expectedGroupBefore('declarations "display", "color"', 'position') }],
	}],
});

testRule({
	description: 'Mixed property groups and includes',
	config: [true, {
		order: [
			{ properties: ['display', 'position', ['width', 'height']], sort: { by: 'name' } },
			{ type: 'at-rule', name: 'include', parameter: 'typography' },
			'group:text',
			'declarations',
			'*',
		],
		groups: {
			text: {
				properties: ['font-size', 'color'],
			},
		},
		categories: {
			declarations: [
				'color',
				// 📌 Already selected by the later text group.
				'position',
				// 📌 Selected by the earlier inline group, so it precedes color.
				'width',
				// 📌 Selected by that earlier group too, so it also precedes color.
				'*',
			],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Interleaves inline and named property groups with includes and keeps local priorities',
		code: `
			.card {
				color: red;
				width: 2rem;
				position: relative;
				@include typography;
				display: block;
				height: 1rem;
				font-size: 1rem;
				opacity: .5;
			}
		`,
		fixed: `
			.card {
				display: block;
				position: relative;
				height: 1rem;
				width: 2rem;
				@include typography;
				font-size: 1rem;
				color: red;
				opacity: .5;
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('display', 'width') },
			{ message: messages.expectedBefore('position', 'width') },
			{ message: messages.expectedBefore('height', 'width') },
			{ message: messages.expectedAfter('color', 'font-size') },
		],
	}],
});

testRule({
	description: 'Canonical names in property groups',
	config: [true, {
		// 📌 Comparison map; the fixed CSS retains the authored spelling:
		// -WEBKIT-APPEARANCE, appearance -> appearance
		// grid-gap, gap                  -> gap
		// font-stretch, font-width       -> font-width
		// word-wrap                      -> overflow-wrap
		categories: {
			declarations: {
				order: [
					{ properties: ['gap', /^appearance$/u] },
					{ properties: ['font-width', 'overflow-wrap'] },
					'*',
				],
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Matches canonical property names without rewriting their authored spelling',
		code: `
			.card {
				color: red;               // 📌 Unmatched properties follow both configured groups.
				-WEBKIT-APPEARANCE: none; // 📌 The pattern matches the lowercase, unprefixed name.
				appearance: auto;
				grid-gap: 1rem;           // 📌 Alias and canonical declarations retain their source order.
				gap: 2rem;
				font-stretch: expanded;   // 📌 Both names match font-width and retain their source order.
				font-width: 120%;
				word-wrap: break-word;    // 📌 Matches overflow-wrap despite its different authored name.
			}
		`,
		fixed: `
			.card {
				grid-gap: 1rem;           // 📌 Alias and canonical declarations retain their source order.
				gap: 2rem;
				-WEBKIT-APPEARANCE: none; // 📌 The pattern matches the lowercase, unprefixed name.
				appearance: auto;
				font-stretch: expanded;   // 📌 Both names match font-width and retain their source order.
				font-width: 120%;
				word-wrap: break-word;    // 📌 Matches overflow-wrap despite its different authored name.
				color: red;               // 📌 Unmatched properties follow both configured groups.
			}
		`,
		warnings: [
			{ message: messages.expectedGroupBefore('declarations "grid-gap", "gap"', '-WEBKIT-APPEARANCE') },
			{ message: messages.expectedAfter('color', 'word-wrap') },
		],
	}],
});

testRule({
	description: 'Cascade constraints under built-in sorting',
	config: [true, {
		categories: {
			declarations: {
				sort: { by: 'name' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Preserves shorthand resets, logical overlap, aliases, and fallbacks',
		code: `
			.card {
				margin-left: 2px;                // 📌 May overlap with margin-inline-start, depending on writing mode.
				margin-inline-start: 1px;
				border-image: url(image.png);    // 📌 The following border shorthand resets border-image.
				border: 0;
				font-variation-settings: normal; // 📌 The following font shorthand resets these settings.
				font: inherit;
				display: block;                  // 📌 Fallback; grid overrides it only when supported.
				display: grid;
				appearance: auto;                // 📌 The following alias overrides this value.
				-webkit-appearance: none;        // 📌 Keep none last; reversing this pair would make auto win.
			}
		`,
		fixed: `
			.card {
				appearance: auto;                // 📌 The following alias overrides this value.
				-webkit-appearance: none;        // 📌 Keep none last; reversing this pair would make auto win.
				border-image: url(image.png);    // 📌 The following border shorthand resets border-image.
				border: 0;
				display: block;                  // 📌 Fallback; grid overrides it only when supported.
				display: grid;
				font-variation-settings: normal; // 📌 The following font shorthand resets these settings.
				font: inherit;
				margin-left: 2px;                // 📌 May overlap with margin-inline-start, depending on writing mode.
				margin-inline-start: 1px;
			}
		`,
		warnings: [
			{ message: messages.expectedGroupBefore('declarations "appearance", "-webkit-appearance"', 'border-image') },
			{
				message: messages.expectedGroupBefore(
					'declarations "display: block", "display: grid"', 'font-variation-settings',
				),
			},
			{ message: messages.expectedGroupAfter('declarations "margin-left", "margin-inline-start"', 'font') },
		],
	}],
});

testRule({
	description: 'Conflicting explicit priorities',
	config: [true, {
		categories: {
			declarations: ['margin', 'margin-top', 'display', '*'],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Retains the conflicting region while fixing an independent region',
		code: '.card { margin-top: 1px; margin: 0; } .other { color: red; display: block; }',
		fixed: '.card { margin-top: 1px; margin: 0; } .other { display: block; color: red; }',
		warnings: [
			{ message: messages.unsafeOrder('margin-top', 'margin') },
			{ message: messages.expectedBefore('display', 'color') },
		],
	}],
});

testRule({
	description: 'Conflicting custom sorting',
	config: [true, {
		categories: {
			declarations: {
				sort: (items) => items.toReversed(),
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Reports an all reset conflict without applying the callback permutation',
		code: '.card { all: unset; color: red; }',
		fixed: '.card { all: unset; color: red; }',
		warnings: [{ message: messages.unsafeOrder('all', 'color') }],
	}],
});
