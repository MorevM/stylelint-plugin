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
		it('Resolves top-level declarations', () => {
			const code = `
				a {}
				b, c {}
			`;

			expect(resolveSelectorInContext(code, 'a')).toShallowEqualArray([
				{ raw: 'a', resolved: 'a', inject: null },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'b')).toShallowEqualArray([
				{ raw: 'b', resolved: 'b', inject: null },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'c')).toShallowEqualArray([
				{ raw: 'c', resolved: 'c', inject: null },
			]);
		});

		it('Resolves deeply nested selectors', () => {
			const code = `a { b { top: 0; c { d {}}}}`;

			expect(resolveSelectorInContext(code, 'd')).toShallowEqualArray([
				{ raw: 'd', resolved: 'a b c d', inject: null },
			]);
		});

		it('Resolves multiple selectors with and without `&` character', () => {
			const code = `
				.foo {
					.bar &, a, & + &:hover {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a, & + &:hover')).toShallowEqualArray([
				{ raw: '.bar &', resolved: '.bar .foo', inject: '.foo' },
				{ raw: 'a', resolved: '.foo a', inject: null },
				{ raw: '& + &:hover', resolved: '.foo + .foo:hover', inject: '.foo' },
			]);
		});

		it('Resolves multiple selectors with and without `&` character individually', () => {
			const code = `
				.foo {
					.bar &, a {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a', '.bar &')).toShallowEqualArray([
				{ raw: '.bar &', resolved: '.bar .foo', inject: '.foo' },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'a')).toShallowEqualArray([
				{ raw: 'a', resolved: '.foo a', inject: null },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'custom')).toShallowEqualArray([
				{ raw: 'custom', resolved: '.foo custom', inject: null },
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
				{ raw: 'b', resolved: '.bar .foo b', inject: null },
				{ raw: 'b', resolved: '.foo + .foo:hover b', inject: null },
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
				{ raw: 'c > &', resolved: 'c > .bar .foo', inject: '.bar .foo' },
				{ raw: 'c > &', resolved: 'c > .foo + .foo:hover', inject: '.foo + .foo:hover' },
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
				{ raw: 'c > &', resolved: 'c > .bar .foo', inject: '.bar .foo' },
				{ raw: 'c > &', resolved: 'c > .foo + .foo:hover', inject: '.foo + .foo:hover' },
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
				{ raw: '> b', resolved: '.foo:hover > b', inject: null },
				{ raw: '> b', resolved: '.foo_bar > b', inject: null },
			]);
		});

		it('Resolves `:is()` with ampersand', () => {
			const code = `
				.a {
					.b:is(:hover, :focus) &, b, b & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b:is(:hover, :focus) &, b, b &')).toShallowEqualArray([
				{ raw: '.b:is(:hover, :focus) &', resolved: '.b:is(:hover, :focus) .a', inject: '.a' },
				{ raw: 'b', resolved: '.a b', inject: null },
				{ raw: 'b &', resolved: 'b .a', inject: '.a' },
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
				{ raw: '& .c', resolved: '.b:is(:hover, :focus) .a .c', inject: '.b:is(:hover, :focus) .a' },
			]);
		});

		it('Resolves ampersands within `:is()`', () => {
			const code = `
				.foo {
					.bar:is(&, &.active) {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar:is(&, &.active)')).toShallowEqualArray([
				{ raw: '.bar:is(&, &.active)', resolved: '.bar:is(.foo, .foo.active)', inject: '.foo' },
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
				{ raw: '& .c', resolved: '.b:not(:hover, :focus) .a .c', inject: '.b:not(:hover, :focus) .a' },
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
				{ raw: '& .c', resolved: '[a=,] .a .c', inject: '[a=,] .a' },
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
				{ raw: '& .c', resolved: 'a \\, .a .c', inject: 'a \\, .a' },
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
				{ raw: '& .c', resolved: '[a=","] .a .c', inject: '[a=","] .a' },
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
				{ raw: '& .e', resolved: '.b .a .e', inject: '.b .a' },
				{ raw: '& .e', resolved: '.a .c .e', inject: '.a .c' },
				{ raw: '& .e', resolved: '.a .d .a .e', inject: '.a .d .a' },
			]);
		});

		it('Preserves ampersand inside attribute string', () => {
			const code = `
				.a {
					.b [c="&"] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c="&"] &')).toShallowEqualArray([
				{ raw: '.b [c="&"] &', resolved: '.b [c="&"] .a', inject: '.a' },
			]);
		});

		it('Preserves ampersand inside unquoted attribute value', () => {
			const code = `
				.a {
					.b [c=&] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c=&] &')).toShallowEqualArray([
				{ raw: '.b [c=&] &', resolved: '.b [c=&] .a', inject: '.a' },
			]);
		});

		it('Preserves escaped ampersand literal', () => {
			const code = `.a {
				.b \\& + & {
					& .c {}
				}
			}`;

			expect(resolveSelectorInContext(code, '& .c')).toShallowEqualArray([
				{ raw: '& .c', resolved: '.b \\& + .a .c', inject: '.b \\& + .a' },
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
				{ raw: '&:hover', resolved: '.foo .bar:hover', inject: '.foo .bar' },
				{ raw: '& b', resolved: '.foo .bar b', inject: '.foo .bar' },
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
				{ raw: '&.active', resolved: '.foo .bar.active', inject: '.foo .bar' },
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
				{ raw: '& .baz', resolved: '.foo .bar .baz', inject: '.foo .bar' },
			]);

			expect(resolveSelectorInContext(code, '& .bar')).toShallowEqualArray([
				{ raw: '& .bar', resolved: '.foo .foo .bar', inject: '.foo .foo' },
			]);
		});

		it('Resolves nesting with `@media` and ampersand prefix', () => {
			const code = `
				.card {
					@media (hover: hover) {
						@media (hover: hover) {
							&:hover:where(.foo--active, .foo-disabled) {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&:hover:where(.foo--active, .foo-disabled)')).toShallowEqualArray([
				{
					raw: '&:hover:where(.foo--active, .foo-disabled)',
					resolved: '.card:hover:where(.foo--active, .foo-disabled)',
					inject: '.card',
				},
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
				.block {
					&__el, &--mod {
						@media (width > 360px) {
							&-value {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&-value')).toShallowEqualArray([
				{ raw: '&-value', resolved: '.block__el-value', inject: '.block__el' },
				{ raw: '&-value', resolved: '.block--mod-value', inject: '.block--mod' },
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
				{ raw: '.baz &', resolved: '.baz .bar .foo-b', inject: '.bar .foo-b' },
				{ raw: '&-c', resolved: '.bar .foo-b-c', inject: '.bar .foo-b' },
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
				{ raw: '&--mod', resolved: '.page--mod', inject: '.page' },
			]);

			expect(resolveSelectorInContext(code, '&--mod2')).toShallowEqualArray([
				{ raw: '&--mod2', resolved: '.page--mod2', inject: '.page' },
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
				{ raw: '.bar', resolved: '.bar', inject: null },
			]);
		});

		it('Can resolve complex selectors at once', () => {
			const code = `
				.card {
					&__item, &__title {
						&--mod1, &--mod2 {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&--mod1, &--mod2')).toShallowEqualArray([
				{ raw: '&--mod1', resolved: '.card__item--mod1', inject: '.card__item' },
				{ raw: '&--mod1', resolved: '.card__title--mod1', inject: '.card__title' },
				{ raw: '&--mod2', resolved: '.card__item--mod2', inject: '.card__item' },
				{ raw: '&--mod2', resolved: '.card__title--mod2', inject: '.card__title' },
			]);
		});

		it('Works with SASS interpolated `&` character', () => {
			const code = `
				.card {
					&__item #{&}__foo {}
					&--mod#{&}--mod2 {}
				}
			`;

			expect(resolveSelectorInContext(code, '&__item #{&}__foo')).toShallowEqualArray([
				{ raw: '&__item #{&}__foo', resolved: '.card__item .card__foo', inject: '.card' },
			]);

			expect(resolveSelectorInContext(code, '&--mod#{&}--mod2')).toShallowEqualArray([
				{ raw: '&--mod#{&}--mod2', resolved: '.card--mod.card--mod2', inject: '.card' },
			]);
		});
	});
});
