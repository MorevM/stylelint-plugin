import scss from 'postcss-scss';
import { isSassDefinition } from './is-sass-definition';

describe(isSassDefinition, () => {
	it('Recognizes function and mixin definitions', () => {
		const root = scss.parse(`
			@function token() { @return 1; }
			@mixin theme { color: red; }
		`);

		expect(root.nodes.map((node) => isSassDefinition(node))).toStrictEqual([true, true]);
	});

	it('Rejects calls, control flow, CSS at-rules and similar names', () => {
		const root = scss.parse(`
			@include theme;
			@if true {}
			@media screen {}
			@mixins theme {}
		`);

		expect(root.nodes.map((node) => isSassDefinition(node))).toStrictEqual([false, false, false, false]);
	});

	it('Keeps Sass directive names case-sensitive', () => {
		const root = scss.parse(`
			@FUNCTION token() {}
			@Mixin theme {}
		`);

		expect(root.nodes.map((node) => isSassDefinition(node))).toStrictEqual([false, false]);
	});

	it('Rejects missing nodes, containers, selectors, declarations and comments', () => {
		const root = scss.parse(`
			.card { color: red; }
			/* @mixin theme */
		`);

		expect(isSassDefinition(undefined)).toBe(false);
		expect(isSassDefinition(root)).toBe(false);

		root.walk((node) => expect(isSassDefinition(node)).toBe(false));
	});
});
