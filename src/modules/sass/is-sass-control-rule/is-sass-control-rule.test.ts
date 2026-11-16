import scss from 'postcss-scss';
import { isSassControlRule } from './is-sass-control-rule';

describe(isSassControlRule, () => {
	it('Recognizes loops and conditional branches including else-if parameters', () => {
		const root = scss.parse(`
			@each $color in red, blue {}
			@for $index from 1 through 3 {}
			@while $enabled {}
			@if $enabled {}
			@else if $fallback {}
			@else {}
		`);

		expect(root.nodes.map((node) => isSassControlRule(node)))
			.toStrictEqual([true, true, true, true, true, true]);
	});

	it('Rejects definitions, module directives, returns, CSS conditions and similar names', () => {
		const root = scss.parse(`
			@mixin theme {}
			@use 'tokens';
			@return 1;
			@supports (display: grid) {}
			@foreach $color {}
		`);

		expect(root.nodes.map((node) => isSassControlRule(node)))
			.toStrictEqual([false, false, false, false, false]);
	});

	it('Keeps Sass directive names case-sensitive', () => {
		const root = scss.parse(`
			@IF true {}
			@Each $color in red, blue {}
		`);

		expect(root.nodes.map((node) => isSassControlRule(node))).toStrictEqual([false, false]);
	});

	it('Rejects missing nodes, containers, selectors, declarations and comments', () => {
		const root = scss.parse(`
			.card { color: red; }
			/* @if true */
		`);

		expect(isSassControlRule(undefined)).toBe(false);
		expect(isSassControlRule(root)).toBe(false);

		root.walk((node) => expect(isSassControlRule(node)).toBe(false));
	});
});
