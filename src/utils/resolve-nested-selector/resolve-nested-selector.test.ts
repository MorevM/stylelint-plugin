import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { resolveNestedSelector } from './resolve-nested-selector';
import type { AtRule, Rule } from 'postcss';

const resolveSelectorInContext = (
	code: string,
	selector: string,
	customSelector?: string,
) => {
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

	return resolveNestedSelector({
		selector: customSelector ?? source!,
		node: found,
	});
};

describe(resolveNestedSelector, () => {
	// Tests from https://github.com/csstools/postcss-resolve-nested-selector/blob/main/test/api.test.mjs
	describe('CSS features', () => {
		it('Resolves deeply nested selectors', () => {
			const code = `a { b { top: 0; c { d {}}}}`;

			expect(resolveSelectorInContext(code, 'd')).toShallowEqualArray([
				'a b c d',
			]);
		});

		it('Resolves multiple selectors with and without `&` character', () => {
			const code = `
				.foo {
					.bar &, a, & + &:hover {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a, & + &:hover')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '.bar &, a', '.bar &')).toShallowEqualArray([
				'.bar .foo',
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'a')).toShallowEqualArray([
				'.foo a',
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'custom')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, 'b')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, 'c > &')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, 'c > &')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '> b')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '.b:is(:hover, :focus) &, b, b &')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
				'.b:is(:hover, :focus) .a .c',
			]);
		});

		it('Resolves ampersands within `:is()`', () => {
			const code = `
				.foo {
					.bar:is(&, &.active) {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar:is(&, &.active)')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .e')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '.b [c="&"] &')).toShallowEqualArray([
				'.b [c="&"] .a',
			]);
		});

		it('preserves ampersand inside unquoted attribute value', () => {
			const code = `
				.a {
					.b [c=&] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c=&] &')).toShallowEqualArray([
				'.b [c=&] .a',
			]);
		});

		it('preserves escaped ampersand literal', () => {
			const code = `.a {
				.b \\& + & {
					& .c {}
				}
			}`;

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '&:hover, & b')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '&.active')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '& .baz')).toShallowEqualArray([
				'.foo .bar .baz',
			]);

			expect(resolveSelectorInContext(code, '& .bar')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '&:hover:where(.foo--active, .foo-disabled)')).toShallowEqualArray([
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

			expect(resolveSelectorInContext(code, '&-value')).toShallowEqualArray([
				'.the-component__element-value',
				'.the-component--modifier-value',
			]);
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

			expect(resolveSelectorInContext(code, '.baz &, &-c')).toShallowEqualArray([
				'.baz .bar .foo-b',
				'.bar .foo-b-c',
			]);
		});

		it('Handles `@at-root` `with` and `without` entries', () => {
			const code = `
				@media print {
					.page {
						width: 8in;

						@at-root (without: media) {
							&--mod {
								color: #111;
							}
						}

						@at-root (with: media) {
							&--mod2 {
								color: #111;
							}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&--mod')).toShallowEqualArray([
				'.page--mod',
			]);

			expect(resolveSelectorInContext(code, '&--mod2')).toShallowEqualArray([
				'.page--mod2',
			]);
		});

		it('Hoists simple `@at-root` case', () => {
			const code = `
				.foo {
					@at-root {
						.bar {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar')).toShallowEqualArray([
				'.bar',
			]);
		});
	});

	describe('Ampersand values', () => {
		it('Returns empty array for a selector without `&` character', () => {
			const code = `
				.foo {
					.bar {
						.baz {}
					}
				}
			`;

			const result = resolveSelectorInContext(code, '.baz');

			expect(result.ampersandValues).toShallowEqualArray([]);
		});

		it('Resolves single ampersand value without selector concatenation', () => {
			const code = `
				.foo {
					.bar {
						.baz & {}
					}
				}
			`;

			const result = resolveSelectorInContext(code, '.baz &');

			expect(result.ampersandValues).toShallowEqualArray([
				'.foo .bar',
			]);
		});

		it('Resolves multiple ampersand values without selector concatenation', () => {
			const code = `
				.foo {
					.bar, .baz {
						.qwe & {}
					}
				}
			`;

			const result = resolveSelectorInContext(code, '.qwe &');

			expect(result.ampersandValues).toShallowEqualArray([
				'.foo .bar',
				'.foo .baz',
			]);
		});

		it('Resolves multiple ampersand values using SASS-style selector concatenation', () => {
			const code = `
				.foo {
					&__el, &--mod, &--mod-value {
						&-value {
							&value {}
						}
					}
				}
			`;

			const result = resolveSelectorInContext(code, '&value');

			expect(result.ampersandValues).toShallowEqualArray([
				'.foo__el-value',
				'.foo--mod-value',
				'.foo--mod-value-value',
			]);
		});

		it('Resolves multiple ampersand values from compound selector', () => {
			const code = `
				.foo {
					&__el, &__el2 {
						&-title, &-subtitle {}
					}
				}
			`;

			const result = resolveSelectorInContext(code, '&-title, &-subtitle');

			expect(result.ampersandValues).toShallowEqualArray([
				'.foo__el',
				'.foo__el2',
			]);
		});
	});
});
