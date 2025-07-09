import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { resolveNestedSelector } from './resolve-nested-selector';
import type { AtRule, Rule } from 'postcss';

const resolveSelectorInContext = (
	code: string,
	selector: string,
	customSelector?: string,
): string[] => {
	const { root } = postcss().process(code, { syntax: postcssScss });

	let found: Rule | AtRule | null = null;
	let source: string | null = null;
	root.walk((rule) => {
		if (found || (rule.type !== 'rule' && rule.type !== 'atrule')) return;
		source = rule.type === 'rule' ? rule.selector : rule.params;
		if (source === selector) {
			found = rule;
		}
	});
	if (!found) throw new Error(`Rule not found: ${selector}`);
	return resolveNestedSelector(customSelector ?? source!, found);
};

describe(resolveNestedSelector, () => {
	// Tests from https://github.com/csstools/postcss-resolve-nested-selector/blob/main/test/api.test.mjs
	describe('CSS features', () => {
		it('Resolves deeply nested selectors', () => {
			const code = `a { b { top: 0; c { d {}}}}`;

			expect(resolveSelectorInContext(code, 'd')).toStrictEqual([
				'a b c d',
			]);
		});

		it('Resolves multiple selectors with and without `&` character', () => {
			const code = `
				.foo {
					.bar &, a, & + &:hover {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a, & + &:hover')).toStrictEqual([
				'.bar .foo',
				'.foo a',
				'.foo + .foo:hover',
			]);
		});

		it('Resolves multiple selectors with and without `&` character individually', () => {
			const code = `
				.foo {
					.bar &, a {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a', '.bar &')).toStrictEqual([
				'.bar .foo',
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'a')).toStrictEqual([
				'.foo a',
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'custom')).toStrictEqual([
				'.foo custom',
			]);
		});

		it('Supports legacy `@nest` syntax', () => {
			const code = `
				.foo {
					@nest .bar &, & + &:hover {
						b {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, 'b')).toStrictEqual([
				'.bar .foo b',
				'.foo + .foo:hover b',
			]);
		});

		it('Resolves ampersand inside selector with combinators', () => {
			const code = `
				.foo {
					.bar &, & + &:hover {
						c > & {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, 'c > &')).toStrictEqual([
				'c > .bar .foo',
				'c > .foo + .foo:hover',
			]);
		});

		it('Works with nested `@nest` and `&`', () => {
			const code = `
				.foo {
					@nest .bar &, & + &:hover {
						@nest c > & {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, 'c > &')).toStrictEqual([
				'c > .bar .foo',
				'c > .foo + .foo:hover',
			]);
		});

		it('Handles `&` in multiple branches', () => {
			const code = `
				.foo {
					&:hover, &_bar {
						> b {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '> b')).toStrictEqual([
				'.foo:hover > b',
				'.foo_bar > b',
			]);
		});

		it('Resolves `:is()` with ampersand', () => {
			const code = `
				.a {
					.b:is(:hover, :focus) &, b, b & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b:is(:hover, :focus) &, b, b &')).toStrictEqual([
				'.b:is(:hover, :focus) .a',
				'.a b',
				'b .a',
			]);
		});

		it('Resolves nested selectors after `:is()` with `&`', () => {
			const code = `
				.a {
					.b:is(:hover, :focus) & {
						& .c {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'.b:is(:hover, :focus) .a .c',
			]);
		});

		it('Resolves ampersands within `:is()`', () => {
			const code = `
				.foo {
					.bar:is(&, &.active) {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar:is(&, &.active)')).toStrictEqual([
				'.bar:is(.foo, .foo.active)',
			]);
		});

		it('Handles @nest with `:not()`', () => {
			const code = `
				.a {
					@nest .b:not(:hover, :focus) & {
						& .c {
							color: red;
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'.b:not(:hover, :focus) .a .c',
			]);
		});

		it('Handles `@nest` with attribute', () => {
			const code = `
				.a {
					@nest [a=,] & {
						& .c {
							color: red;
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'[a=,] .a .c',
			]);
		});

		it('Handles @nest with escaped commas', () => {
			const code = `
				.a {
					@nest a \\, & {
						& .c {
							color: red;
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'a \\, .a .c',
			]);
		});

		it('Handles `@nest` with quoted attribute', () => {
			const code = `
				.a {
					@nest [a=","] & {
						& .c {
							color: red;
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'[a=","] .a .c',
			]);
		});

		it('Handles multiple `@nest` combinations', () => {
			const code = `
				.a {
					@nest .b & , & .c , & .d & {
						& .e {
							color: red;
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .e')).toStrictEqual([
				'.b .a .e',
				'.a .c .e',
				'.a .d .a .e',
			]);
		});

		it('Preserves ampersand inside attribute string', () => {
			const code = `
				.a {
					.b [c="&"] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c="&"] &')).toStrictEqual([
				'.b [c="&"] .a',
			]);
		});

		it('preserves ampersand inside unquoted attribute value', () => {
			const code = `
				.a {
					.b [c=&] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c=&] &')).toStrictEqual([
				'.b [c=&] .a',
			]);
		});

		it('preserves escaped ampersand literal', () => {
			const code = `.a {
				.b \\& + & {
					& .c {}
				}
			}`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				'.b \\& + .a .c',
			]);
		});

		it('Resolves nesting inside a single `@media` rule', () => {
			const code = `
				.foo {
					@media (max-width: 360px) {
						.bar {
							&:hover, & b {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&:hover, & b')).toStrictEqual([
				'.foo .bar:hover',
				'.foo .bar b',
			]);
		});

		it('Resolves nesting inside multiple nested` @media`/`@supports` rules', () => {
			const code = `
				.foo {
					@media (min-width: 768px) {
						@supports (display: grid) {
							.bar {
								&.active {}
							}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&.active')).toStrictEqual([
				'.foo .bar.active',
			]);
		});

		it('Resolves multiple sibling at-rules with nested selectors', () => {
			const code = `
				.foo {
					@media (min-width: 768px) {
						.bar {
							& .baz {}
						}
					}

					@supports (display: flex) {
						.foo {
							& .bar {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '& .baz')).toStrictEqual([
				'.foo .bar .baz',
			]);

			expect(resolveSelectorInContext(code, '& .bar')).toStrictEqual([
				'.foo .foo .bar',
			]);
		});

		it('Resolves nesting with `@media` and ampersand prefix', () => {
			const code = `
				.card {
					@media (hover: hover) {
						&:hover:where(.foo--active, .foo-disabled) {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&:hover:where(.foo--active, .foo-disabled)')).toStrictEqual([
				'.card:hover:where(.foo--active, .foo-disabled)',
			]);
		});
	});

	// Note:
	// It does not match SASS behavior for complex selectors like
	// `.foo { &-bar { &-baz & } }`, but SASS have to change their
	// behavior to use `:is` anyway soon https://github.com/sass/sass/issues/3030
	describe('SCSS features', () => {
		it('Resolves deeply nested selectors', () => {
			const code = `
				.the-component {
					&__element, &--modifier {
						@media (width > 360px) {
							&-value {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&-value').sort()).toStrictEqual([
				'.the-component__element-value',
				'.the-component--modifier-value',
			].sort());
		});

		it('Handles `@at-root` at-rule', () => {
			const code = `
				.foo {
					@at-root .bar & {
						&-b {
							@at-root .baz &, &-c {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '.baz &, &-c').sort()).toStrictEqual([
				'.baz .bar .foo-b',
				'.bar .foo-b-c',
			].sort());
		});
	});
});
