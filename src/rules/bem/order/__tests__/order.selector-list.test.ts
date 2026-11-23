import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Inherited selector-list ordering',
	config: [true, {
		selectorList: {
			order: 'inherit',
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Keeps incompatible inherited lists and Stylelint-disabled lists untouched',
		code: `
			.card:focus, .button:hover {}
			/* stylelint-disable-next-line @morev/bem/order */
			.card:focus, .card:hover {}
		`,
	}],
	reject: [{
		description: 'Orders inherited branches independently of whole-rule priorities',
		code: `
			.card:active {}
			.card:focus, .card:hover, .card:hover {}
			.card:hover {}
			.card { &:focus, &:hover {} }
		`,
		fixed: `
			.card { &:hover, &:focus {} }
			.card:hover {}
			.card:active {}
			.card:hover, .card:hover, .card:focus {}
		`,
		warnings: [
			{ message: messages.selectorList('.card:hover, .card:hover, .card:focus') },
			{ message: messages.selectorList('&:hover, &:focus') },
			{ message: messages.expectedBefore('.card', '.card:active') },
			{ message: messages.expectedBefore('.card:hover', '.card:active') },
		],
	}],
});

testRule({
	description: 'Generic selector-list name sorting',
	config: [true, {
		selectorList: {
			sort: { by: 'name' },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts complete branches while keeping comments and functional lists intact',
		code: `
			span:is(.z, .a),
			/* Link */ a,
			button {}
		`,
		fixed: `
			/* Link */ a,
			button,
			span:is(.z, .a) {}
		`,
		warnings: [{ message: messages.selectorList('/* Link */ a,\nbutton,\nspan:is(.z, .a)') }],
	}],
});

testRule({
	description: 'Selector-list remainder between explicit priorities',
	config: [true, {
		selectorList: { order: [':hover', '*', { type: 'rule', relativeSelector: '&:active', label: 'Active' }] },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Places other branches between hover and active',
		code: '.card:active, .card:focus, .card:hover {}',
		fixed: '.card:hover, .card:focus, .card:active {}',
		warnings: [{ message: messages.selectorList('.card:hover, .card:focus, Active (.card:active)') }],
	}],
});

testRule({
	description: 'Explicit selector-list priorities',
	config: [true, {
		selectorList: {
			order: [':hover', [':focus-visible', ':focus']],
			sort: { by: 'name' },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts equal-rank branches without moving ignored slots',
		code: '.card:focus-visible, .card:unknown, .card:hover, .card:focus {}',
		fixed: '.card:hover, .card:unknown, .card:focus, .card:focus-visible {}',
		warnings: [{ message: messages.selectorList('.card:hover, .card:unknown, .card:focus, .card:focus-visible') }],
	}],
});

testRule({
	description: 'Descending selector-list name sorting',
	config: [true, {
		selectorList: {
			sort: { by: 'name', direction: 'desc' },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Reverses name comparisons for generic branches',
		code: 'a, span, button {}',
		fixed: 'span, button, a {}',
		warnings: [{ message: messages.selectorList('span, button, a') }],
	}],
});

testRule({
	description: 'Descending selector-list comparisons within explicit ranks',
	config: [true, {
		selectorList: {
			order: [{ type: 'rule', relativeSelector: '&:hover', label: 'Hover' }, [':focus', ':focus-visible']],
			sort: { by: 'name', direction: 'desc' },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Retains explicit priorities and ignored slots while reversing tied names',
		code: '.card:focus, .card:unknown, .card:hover, .card:focus-visible {}',
		fixed: '.card:hover, .card:unknown, .card:focus-visible, .card:focus {}',
		warnings: [{ message: messages.selectorList('Hover (.card:hover), .card:unknown, .card:focus-visible, .card:focus') }],
	}],
});
