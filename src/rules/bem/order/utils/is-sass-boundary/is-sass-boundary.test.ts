import scss from 'postcss-scss';
import { isSassBoundary } from './is-sass-boundary';
import type { Rule } from 'postcss';

describe(isSassBoundary, () => {
	it('Treats mixin and function definitions as boundaries only when nested', () => {
		const root = scss.parse(`
			@mixin theme { color: red; }
			@function spacing() { @return 1rem; }
		`);
		const [mixin, fn] = root.nodes;

		expect(isSassBoundary(mixin, true)).toBe(false);
		expect(isSassBoundary(mixin, false)).toBe(true);
		expect(isSassBoundary(fn, true)).toBe(false);
		expect(isSassBoundary(fn, false)).toBe(true);
	});

	it('Protects module directives, control flow and scope escapes', () => {
		const root = scss.parse(`
			@use 'tokens';
			@if $enabled { .card { color: red; } }
			@at-root { .card { color: red; } }
		`);
		const [use, condition, atRoot] = root.nodes;

		expect(isSassBoundary(use, true)).toBe(true);
		expect(isSassBoundary(condition, true)).toBe(true);
		expect(isSassBoundary(atRoot, false)).toBe(true);
	});

	it('Does not treat ordinary rules, declarations, media or includes as boundaries', () => {
		const root = scss.parse(`
			@media screen { .card { color: red; } }
			.card {
				color: red;
				@include theme;
			}
		`);
		const [media, rule] = root.nodes;
		const [declaration, include] = (rule as Rule).nodes;

		expect(isSassBoundary(media, false)).toBe(false);
		expect(isSassBoundary(rule, false)).toBe(false);
		expect(isSassBoundary(declaration, false)).toBe(false);
		expect(isSassBoundary(include, false)).toBe(false);
	});
});
