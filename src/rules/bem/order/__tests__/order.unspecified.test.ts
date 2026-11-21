import rule from '../order';
import { DEFAULT_ORDER, DEFAULT_ROOT_ORDER } from '../order.constants';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Ignored declaration slots',
	config: [true, {
		categories: {
			declarations: {
				order: ['display', 'position', 'color', 'width', 'height'],
				unspecified: 'ignore',
			},
		},
	}],
	reject: [{
		description: 'Keeps an unspecified property in place without reporting it as a cheaper physical move',
		code: `
			.card {
				width: 1px;
				height: 1px;
				z-index: 1;
				display: grid;
				position: relative;
				color: red;
			}
		`,
		fixed: `
			.card {
				display: grid;
				position: relative;
				z-index: 1;
				color: red;
				width: 1px;
				height: 1px;
			}
		`,
		warnings: [{ message: messages.expectedGroupAfter('declarations "width", "height"', 'color') }],
	}],
});

testRule({
	description: 'Ignored semantic families',
	config: [true, {
		categories: {
			elements: { order: ['.card__title', '.card__icon'], unspecified: 'ignore' },
		},
	}],
	reject: [{
		description: 'Retains an ignored family slot while still checking its states',
		code: `
			.card__icon {}
			.card__unknown:active {}
			.card__title {}
			.card__unknown:hover {}
		`,
		fixed: `
			.card__title {}
			.card__unknown:hover {}
			.card__unknown:active {}
			.card__icon {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.card__title', '.card__icon') },
			{ message: messages.expectedBefore('.card__unknown:hover', '.card__unknown:active') },
		],
	}],
});

describe('Default structural orders', () => {
	it('Leaves unmatched nested items to unspecified', () => {
		expect(DEFAULT_ORDER).not.toContain('*');
	});

	it('Leaves unmatched items to root.unspecified', () => {
		expect(DEFAULT_ROOT_ORDER).not.toContain('*');
	});
});

testRule({
	description: 'Unspecified at-rules at the top of the stylesheet',
	config: [true, { root: { order: ['rules'], unspecified: 'top' } }],
	reject: [{
		description: 'Moves an unmatched media query before a selector',
		code: `
			.card {}
			@media print {}
		`,
		fixed: `
			@media print {}
			.card {}
		`,
		warnings: [{ message: messages.expectedBefore('@media print', '.card') }],
	}],
});

testRule({
	description: 'Independent root policy',
	config: [true, {
		order: ['declarations', 'pseudo-classes'],
		unspecified: 'top',
		root: {
			order: [{ type: 'rule', selector: '.button' }, { type: 'rule', selector: '.card' }],
			unspecified: 'ignore',
		},
	}],
	reject: [{
		description: 'Overrides the document policy while preserving the nested policy',
		code: `
			.card {
				color: red;
				@media screen {}
				&:hover {}
			}
			@supports (display: grid) {}
			.button {}
		`,
		fixed: `
			.button {}
			@supports (display: grid) {}
			.card {
				@media screen {}
				color: red;
				&:hover {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media screen', 'color') },
			{ message: messages.expectedBefore('.button', '.card') },
		],
	}],
});

testRule({
	description: 'Unspecified priorities and transformed sequences',
	config: [true, {
		categories: { declarations: { order: () => ['color'], unspecified: 'top' } },
	}],
	reject: [{
		description: 'Places unspecified properties first in their original order',
		code: `
			.card {
				color: red;
				display: grid;
				width: 1px;
			}
		`,
		fixed: `
			.card {
				display: grid;
				width: 1px;
				color: red;
			}
		`,
		warnings: [{ message: messages.expectedAfter('color', 'width') }],
	}],
});

testRule({
	description: 'Explicit remainder priority',
	config: [true, {
		root: { order: ['rules', '*'], unspecified: 'top' },
		categories: { declarations: { order: ['color', '*'], unspecified: 'ignore' } },
	}],
	accept: [{
		description: 'Treats an explicit remainder as matched before applying unspecified policies',
		code: `
			.card { color: red; display: grid; }
			@media screen {}
		`,
	}],
});

testRule({
	description: 'Unspecified selector lists at the bottom',
	config: [true, { categories: { 'pseudo-classes': [':hover', ':active'] } }],
	reject: [{
		description: 'Moves hover across a list that does not match an individual state string',
		code: `
			.card {
				&:active {}
				&:hover, &:focus {} // 📌 The whole list is unspecified.
				&:hover {} // 📌 First priority can cross the list.
			}
		`,
		fixed: `
			.card {
				&:hover {} // 📌 First priority can cross the list.
				&:active {}
				&:hover, &:focus {} // 📌 The whole list is unspecified.
			}
		`,
		warnings: [{ message: messages.expectedBefore('&:hover', '&:active') }],
	}],
});

testRule({
	description: 'Unspecified selector lists at the top',
	config: [true, { categories: { 'pseudo-classes': { order: [':hover', ':active'], unspecified: 'top' } } }],
	reject: [{
		description: 'Places an unmatched whole list before explicitly ranked states',
		code: `
			.card {
				&:active {}
				&:hover, &:focus {} // 📌 Unspecified lists belong before explicit priorities.
				&:hover {}
			}
		`,
		fixed: `
			.card {
				&:hover, &:focus {} // 📌 Unspecified lists belong before explicit priorities.
				&:hover {}
				&:active {}
			}
		`,
		warnings: [{ message: messages.expectedAfter('&:active', '&:hover') }],
	}],
});

testRule({
	description: 'Ignored selector-list slots',
	config: [true, { categories: { 'pseudo-classes': { order: [':hover', ':active'], unspecified: 'ignore' } } }],
	reject: [{
		description: 'Keeps the list in its slot while sorting states across it',
		code: `
			.card {
				&:active {}
				&:hover, &:focus {} // 📌 This slot stays fixed without splitting the region.
				&:hover {}
			}
		`,
		fixed: `
			.card {
				&:hover {}
				&:hover, &:focus {} // 📌 This slot stays fixed without splitting the region.
				&:active {}
			}
		`,
		warnings: [{ message: messages.expectedBefore('&:hover', '&:active') }],
	}],
});

testRule({
	description: 'Explicit selector-list remainder',
	config: [true, {
		categories: { 'pseudo-classes': { order: [':hover', ':active', '*'], unspecified: 'ignore' } },
	}],
	reject: [{
		description: 'Uses the wildcard priority for the whole list instead of ignoring it',
		code: `
			.card {
				&:active {}
				&:hover, &:focus {} // 📌 The wildcard explicitly assigns the last priority.
				&:hover {}
			}
		`,
		fixed: `
			.card {
				&:hover {}
				&:active {}
				&:hover, &:focus {} // 📌 The wildcard explicitly assigns the last priority.
			}
		`,
		warnings: [{ message: messages.expectedBefore('&:hover', '&:active') }],
	}],
});
