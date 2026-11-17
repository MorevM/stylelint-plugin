import rule from '../order';
import type { WithinSequence } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

const states = [
	':hover',
	':focus-visible',
	{ selectorSet: { equals: [':hover', ':focus-visible'] } },
	{ selectorSet: { includes: [':hover'], size: 2 } },
	{ selectorSet: { includes: [':hover'] } },
	':active',
	'*',
] as const satisfies WithinSequence;

testRule({
	description: 'Selector sets alongside simple states',
	config: [true, { within: { 'pseudo-classes': states } }],
	reject: [{
		description: 'Matches reversed and repeated branches in flat and nested rules without rewriting them',
		code: `
			.card:focus-visible, .card:hover, .card:hover {}
			.card:focus-visible {}
			.card {
				&:focus-visible, &:hover {}
				&:hover {}
			}
		`,
		fixed: `
			.card {
				&:hover {}
				&:focus-visible, &:hover {}
			}
			.card:focus-visible {}
			.card:focus-visible, .card:hover, .card:hover {}
		`,
		warnings: [
			{ message: messages.expectedBefore('&:hover', '&:focus-visible, &:hover') },
			{ message: messages.expectedBefore('.card', '.card:focus-visible, .card:hover, .card:hover') },
			{ message: messages.expectedBefore('.card:focus-visible', '.card:focus-visible, .card:hover, .card:hover') },
		],
	}],
});

testRule({
	description: 'Inclusive selector sets',
	config: [true, { within: { 'pseudo-classes': () => states } }],
	reject: [{
		description: 'Distinguishes exact size, arbitrary extra branches, and compound pseudo-classes',
		code: `
			.card {
				&:hover, &:active, &:focus-visible {}
				&:hover, &:not(.disabled, .loading) {}
				&:active {}
				&:hover:focus-visible {}
			}
		`,
		fixed: `
			.card {
				&:hover:focus-visible {}
				&:hover, &:not(.disabled, .loading) {}
				&:hover, &:active, &:focus-visible {}
				&:active {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('&:hover:focus-visible', '&:hover, &:active, &:focus-visible') },
			{ message: messages.expectedBefore('&:hover, &:not(.disabled, .loading)', '&:hover, &:active, &:focus-visible') },
		],
	}],
	accept: [{
		description: 'Preserves lists with different owners as boundaries',
		code: `
			.card:active {}
			.card:hover, .button:focus-visible {}
			.card:hover {}
		`,
	}],
});

testRule({
	description: 'Ordinary selector lists',
	config: [true, { order: ['declarations', 'rules'] }],
	reject: [{
		description: 'Moves declarations before an atomic ordinary selector list with its comment',
		code: `
			.host {
				/* Headings */
				h1, h2 {}
				color: red;
			}
		`,
		fixed: `
			.host {
				color: red;
				/* Headings */
				h1, h2 {}
			}
		`,
		warnings: [{ message: messages.expectedBefore('color', 'h1, h2') }],
	}],
	accept: [{
		description: 'Retains mixed, ambiguous BEM, and unresolved lists as movement boundaries',
		code: `
			.host {
				h1, .card {}
				color: red;
				.card, .button {}
				display: block;
				#{$unknown}, h2 {}
				opacity: .5;
			}
		`,
	}],
});

testRule({
	description: 'Explicit ordinary selector-list matchers',
	config: [true, { order: ['declarations', { type: 'rule', selector: 'h1, h2' }] }],
	reject: [{
		description: 'Applies an authored selector matcher to the whole list',
		code: '.host { h1, h2 {} color: red; }',
		fixed: '.host { color: red; h1, h2 {} }',
		warnings: [{ message: messages.expectedBefore('color', 'h1, h2') }],
	}],
});

testRule({
	description: 'Exact selector sets with reordered conditions',
	config: [true, {
		order: ['base', 'pseudo-classes', 'qualifiers:class'],
		within: {
			'pseudo-classes': [
				':hover',
				{ selectorSet: { equals: [':hover.foo', '.foo:focus'] } },
				':active',
			],
		},
	}],
	reject: [{
		description: 'Moves hover across an unmatched list and places that list after explicit priorities',
		code: `
			.card {}
			.card.foo:active {} // 📌 Last explicit priority.
			.card:hover.foo, .card.foo:focus, .card.foo:hover {} // 📌 Equivalent hovers count once.
			.card:hover.foo, .card.foo:focus, .card.foo.foo:hover {} // 📌 Unmatched: three distinct branches.
			.card.foo:hover {} // 📌 First priority crosses the unmatched list.
		`,
		fixed: `
			.card {}
			.card.foo:hover {} // 📌 First priority crosses the unmatched list.
			.card:hover.foo, .card.foo:focus, .card.foo:hover {} // 📌 Equivalent hovers count once.
			.card.foo:active {} // 📌 Last explicit priority.
			.card:hover.foo, .card.foo:focus, .card.foo.foo:hover {} // 📌 Unmatched: three distinct branches.
		`,
		warnings: [
			{ message: messages.expectedBefore('.card.foo:hover', '.card.foo:active') },
			{
				message: messages.expectedBefore(
					'.card:hover.foo, .card.foo:focus, .card.foo:hover', '.card.foo:active',
				),
			},
		],
	}, {
		description: 'Matches reversed branches with the opposite condition order to the configured spelling',
		code: `
			.card {}
			.card.foo:active {}
			.card:focus.foo, .card.foo:hover {} // 📌 Same exact set, different spelling and branch order.
		`,
		fixed: `
			.card {}
			.card:focus.foo, .card.foo:hover {} // 📌 Same exact set, different spelling and branch order.
			.card.foo:active {}
		`,
		warnings: [{
			message: messages.expectedBefore('.card:focus.foo, .card.foo:hover', '.card.foo:active'),
		}],
	}],
	accept: [{
		description: 'Does not match a set with a different focus state',
		code: `
			.card {}
			.card.foo:active {}
			.card.foo:hover, .card.foo:focus-visible {} // 📌 focus-visible does not satisfy focus.
		`,
	}, {
		description: 'Does not match an exact set with an extra distinct branch',
		code: `
			.card {}
			.card.foo:active {}
			.card.foo:hover, .card.foo:focus, .card.foo:focus-visible {} // 📌 Three distinct branches, not two.
		`,
	}],
});

testRule({
	description: 'Inclusive selector sets with reordered conditions',
	config: [true, {
		order: ['base', 'pseudo-classes', 'qualifiers:class'],
		within: {
			'pseudo-classes': [
				':hover',
				{ selectorSet: { includes: [':hover.foo'], size: 2 } },
				':active',
			],
		},
	}],
	reject: [{
		description: 'Counts equivalent authored branches only once toward the requested size',
		code: `
			.card {}
			.card.foo:active {} // 📌 Last priority.
			.card:hover.foo, .card.foo:focus, .card.foo:hover {} // 📌 Duplicate hover still gives size 2.
			.card.foo:hover {} // 📌 First priority: a single hover.
		`,
		fixed: `
			.card {}
			.card.foo:hover {} // 📌 First priority: a single hover.
			.card:hover.foo, .card.foo:focus, .card.foo:hover {} // 📌 Duplicate hover still gives size 2.
			.card.foo:active {} // 📌 Last priority.
		`,
		warnings: [
			{ message: messages.expectedBefore('.card.foo:hover', '.card.foo:active') },
			{
				message: messages.expectedBefore(
					'.card:hover.foo, .card.foo:focus, .card.foo:hover', '.card.foo:active',
				),
			},
		],
	}, {
		description: 'Allows any second distinct branch when the required hover is present',
		code: `
			.card {}
			.card.foo:active {}
			.card.foo:hover, .card.foo:focus-visible {} // 📌 hover is required; the second branch is free.
		`,
		fixed: `
			.card {}
			.card.foo:hover, .card.foo:focus-visible {} // 📌 hover is required; the second branch is free.
			.card.foo:active {}
		`,
		warnings: [{
			message: messages.expectedBefore('.card.foo:hover, .card.foo:focus-visible', '.card.foo:active'),
		}],
	}],
	accept: [{
		description: 'Does not match two branches without the required hover',
		code: `
			.card {}
			.card.foo:active {}
			.card.foo:focus, .card.foo:focus-visible {} // 📌 Size 2, but no hover branch.
		`,
	}, {
		description: 'Does not match three distinct branches when size requires two',
		code: `
			.card {}
			.card.foo:active {}
			.card.foo:hover, .card.foo:focus, .card.foo:focus-visible {} // 📌 hover exists, but size is 3.
		`,
	}],
});

testRule({
	description: 'Selector-set category assignment',
	config: [true, {
		order: ['base', 'pseudo-classes', 'qualifiers:class'],
		within: {
			'qualifiers:class': [{ selectorSet: { equals: [':hover.foo', ':focus.foo'] } }],
		},
	}],
	reject: [{
		description: 'Treats a list as unspecified when its matcher belongs to a different ordering category',
		code: `
			.card {}
			.card:active.foo {}
			.card:hover.foo, .card:focus.foo {}
			.card:hover.foo {}
		`,
		fixed: `
			.card {}
			.card:hover.foo {}
			.card:active.foo {}
			.card:hover.foo, .card:focus.foo {}
		`,
		warnings: [{ message: messages.expectedBefore('.card:hover.foo', '.card:active.foo') }],
	}],
});

testRule({
	description: 'Shared selector-list categories',
	config: [true, { order: ['base', 'qualifiers:class', 'pseudo-classes', 'qualifiers:attribute'] }],
	reject: [{
		description: 'Uses the common pseudo-class category despite an earlier class category',
		code: `
			.card {}
			.card:hover.foo {}
			.card:hover.foo, .card:focus[data-active] {} // 📌 Only pseudo-classes is shared.
			.card.foo:active {} // 📌 Class category comes before the list's common category.
		`,
		fixed: `
			.card {}
			.card:hover.foo {}
			.card.foo:active {} // 📌 Class category comes before the list's common category.
			.card:hover.foo, .card:focus[data-active] {} // 📌 Only pseudo-classes is shared.
		`,
		warnings: [{
			message: messages.expectedBefore('.card.foo:active', '.card:hover.foo, .card:focus[data-active]'),
		}],
	}],
});

testRule({
	description: 'Disjoint selector-list categories',
	config: [true, {
		order: ['base', 'qualifiers:attribute', 'pseudo-classes'],
		selectorList: { sort: { by: 'name' } },
	}],
	reject: [{
		description: 'Keeps the configured union category when branch sorting changes the first selector',
		code: `
			.card:hover {}
			.card[data-active], .card:focus {} // 📌 The configured attribute category wins.
			.card {}
		`,
		fixed: `
			.card {}
			.card:focus, .card[data-active] {} // 📌 The configured attribute category wins.
			.card:hover {}
		`,
		warnings: [
			{ message: messages.selectorList('.card:focus, .card[data-active]') },
			{ message: messages.expectedBefore('.card', '.card:hover') },
			{ message: messages.expectedBefore('.card[data-active], .card:focus', '.card:hover') },
		],
	}],
});
