import { getRuleBySelector } from '#modules/test-utils';
import { resolveNestedSelector } from './resolve-nested-selector';

const resolveSelectorInContext = (
	code: string,
	selector: string,
	customSelector?: string,
) => {
	return resolveNestedSelector({
		selector: customSelector,
		node: getRuleBySelector(code, selector),
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

			expect(resolveSelectorInContext(code, 'a')).toStrictEqual([
				{ raw: 'a', resolved: 'a', inject: '', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, 'b, c')).toStrictEqual([
				{ raw: 'b', resolved: 'b', inject: '', offset: 0 },
				{ raw: 'c', resolved: 'c', inject: '', offset: 3 },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'b')).toStrictEqual([
				{ raw: 'b', resolved: 'b', inject: '', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'c')).toStrictEqual([
				{ raw: 'c', resolved: 'c', inject: '', offset: 0 },
			]);
		});

		it('Resolves deeply nested selectors', () => {
			const code = `a { b, c { d { e, f {}}}}`;

			expect(resolveSelectorInContext(code, 'e, f')).toStrictEqual([
				{ raw: 'e', resolved: 'a b d e', inject: 'a b d ', offset: 0 },
				{ raw: 'e', resolved: 'a c d e', inject: 'a c d ', offset: 0 },
				{ raw: 'f', resolved: 'a b d f', inject: 'a b d ', offset: 3 },
				{ raw: 'f', resolved: 'a c d f', inject: 'a c d ', offset: 3 },
			]);
		});

		it('Resolves multiple selectors with and without `&` character', () => {
			const code = `
				.foo {
					.bar &, a, & + &:hover {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a, & + &:hover')).toStrictEqual([
				{ raw: '.bar &', resolved: '.bar .foo', inject: '.foo', offset: 0 },
				{ raw: 'a', resolved: '.foo a', inject: '.foo ', offset: 8 },
				{ raw: '& + &:hover', resolved: '.foo + .foo:hover', inject: '.foo', offset: 11 },
			]);
		});

		it('Resolves multiple selectors with and without `&` character individually', () => {
			const code = `
				.foo {
					.bar &, a {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a', '.bar &')).toStrictEqual([
				{ raw: '.bar &', resolved: '.bar .foo', inject: '.foo', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'a')).toStrictEqual([
				{ raw: 'a', resolved: '.foo a', inject: '.foo ', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'custom')).toStrictEqual([
				{ raw: 'custom', resolved: '.foo custom', inject: '.foo ', offset: 0 },
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
				{ raw: 'b', resolved: '.bar .foo b', inject: '.bar .foo ', offset: 0 },
				{ raw: 'b', resolved: '.foo + .foo:hover b', inject: '.foo + .foo:hover ', offset: 0 },
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
				{ raw: 'c > &', resolved: 'c > .bar .foo', inject: '.bar .foo', offset: 0 },
				{ raw: 'c > &', resolved: 'c > .foo + .foo:hover', inject: '.foo + .foo:hover', offset: 0 },
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
				{ raw: 'c > &', resolved: 'c > .bar .foo', inject: '.bar .foo', offset: 0 },
				{ raw: 'c > &', resolved: 'c > .foo + .foo:hover', inject: '.foo + .foo:hover', offset: 0 },
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
				{ raw: '> b', resolved: '.foo:hover > b', inject: '.foo:hover ', offset: 0 },
				{ raw: '> b', resolved: '.foo_bar > b', inject: '.foo_bar ', offset: 0 },
			]);
		});

		it('Resolves `:is()` with ampersand', () => {
			const code = `
				.a {
					.b:is(:hover, :focus) &, b, b & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b:is(:hover, :focus) &, b, b &')).toStrictEqual([
				{ raw: '.b:is(:hover, :focus) &', resolved: '.b:is(:hover, :focus) .a', inject: '.a', offset: 0 },
				{ raw: 'b', resolved: '.a b', inject: '.a ', offset: 25 },
				{ raw: 'b &', resolved: 'b .a', inject: '.a', offset: 28 },
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
				{ raw: '& .c', resolved: '.b:is(:hover, :focus) .a .c', inject: '.b:is(:hover, :focus) .a', offset: 0 },
			]);
		});

		it('Resolves ampersands within `:is()`', () => {
			const code = `
				.foo {
					.bar:is(&, &.active) {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar:is(&, &.active)')).toStrictEqual([
				{ raw: '.bar:is(&, &.active)', resolved: '.bar:is(.foo, .foo.active)', inject: '.foo', offset: 0 },
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
				{ raw: '& .c', resolved: '.b:not(:hover, :focus) .a .c', inject: '.b:not(:hover, :focus) .a', offset: 0 },
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
				{ raw: '& .c', resolved: '[a=,] .a .c', inject: '[a=,] .a', offset: 0 },
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
				{ raw: '& .c', resolved: 'a \\, .a .c', inject: 'a \\, .a', offset: 0 },
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
				{ raw: '& .c', resolved: '[a=","] .a .c', inject: '[a=","] .a', offset: 0 },
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
				{ raw: '& .e', resolved: '.b .a .e', inject: '.b .a', offset: 0 },
				{ raw: '& .e', resolved: '.a .c .e', inject: '.a .c', offset: 0 },
				{ raw: '& .e', resolved: '.a .d .a .e', inject: '.a .d .a', offset: 0 },
			]);
		});

		it('Preserves ampersand inside attribute string', () => {
			const code = `
				.a {
					.b [c="&"] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c="&"] &')).toStrictEqual([
				{ raw: '.b [c="&"] &', resolved: '.b [c="&"] .a', inject: '.a', offset: 0 },
			]);
		});

		it('Preserves ampersand inside unquoted attribute value', () => {
			const code = `
				.a {
					.b [c=&] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c=&] &')).toStrictEqual([
				{ raw: '.b [c=&] &', resolved: '.b [c=&] .a', inject: '.a', offset: 0 },
			]);
		});

		it('Preserves escaped ampersand literal', () => {
			const code = `.a {
				.b \\& + & {
					& .c {}
				}
			}`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				{ raw: '& .c', resolved: '.b \\& + .a .c', inject: '.b \\& + .a', offset: 0 },
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
				{ raw: '&:hover', resolved: '.foo .bar:hover', inject: '.foo .bar', offset: 0 },
				{ raw: '& b', resolved: '.foo .bar b', inject: '.foo .bar', offset: 9 },
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
				{ raw: '&.active', resolved: '.foo .bar.active', inject: '.foo .bar', offset: 0 },
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
				{ raw: '& .baz', resolved: '.foo .bar .baz', inject: '.foo .bar', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '& .bar')).toStrictEqual([
				{ raw: '& .bar', resolved: '.foo .foo .bar', inject: '.foo .foo', offset: 0 },
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

			expect(resolveSelectorInContext(code, '&:hover:where(.foo--active, .foo-disabled)')).toStrictEqual([
				{
					raw: '&:hover:where(.foo--active, .foo-disabled)',
					resolved: '.card:hover:where(.foo--active, .foo-disabled)',
					inject: '.card',
					offset: 0,
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

			expect(resolveSelectorInContext(code, '&-value')).toStrictEqual([
				{ raw: '&-value', resolved: '.block__el-value', inject: '.block__el', offset: 0 },
				{ raw: '&-value', resolved: '.block--mod-value', inject: '.block--mod', offset: 0 },
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

			expect(resolveSelectorInContext(code, '.baz &, &-c')).toStrictEqual([
				{ raw: '.baz &', resolved: '.baz .bar .foo-b', inject: '.bar .foo-b', offset: 0 },
				{ raw: '&-c', resolved: '.bar .foo-b-c', inject: '.bar .foo-b', offset: 8 },
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

			expect(resolveSelectorInContext(code, '&--mod')).toStrictEqual([
				{ raw: '&--mod', resolved: '.page--mod', inject: '.page', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '&--mod2')).toStrictEqual([
				{ raw: '&--mod2', resolved: '.page--mod2', inject: '.page', offset: 0 },
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

			expect(resolveSelectorInContext(code, '.bar')).toStrictEqual([
				{ raw: '.bar', resolved: '.bar', inject: '', offset: 0 },
			]);
		});

		it('Hoists complex `@at-root` case', () => {
			const code = `
				.foo {
					.bar &, & .baz  {
						@at-root {
							.bar {}
						}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar')).toStrictEqual([
				{ raw: '.bar', resolved: '.bar', inject: '', offset: 0 },
			]);
		});

		it('Hoists complex `@at-root` case (@at-root with value)', () => {
			const code = `
				.foo {
					@at-root .bar {
						&__item {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&__item')).toStrictEqual([
				{ raw: '&__item', resolved: '.bar__item', inject: '.bar', offset: 0 },
			]);
		});

		it('Does not add `inject` if pointed to `@at-root` without `&`', () => {
			const code = `
				.foo {
					@at-root .bar, .baz {
						&__item {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar, .baz')).toStrictEqual([
				{ raw: '.bar', resolved: '.bar', inject: '', offset: 0 },
				{ raw: '.baz', resolved: '.baz', inject: '', offset: 6 },
			]);
		});

		it('Can resolve complex selectors at once', () => {
			const code = `
				.card {
					&__item, &__title {
						&--mod-mod, &--mod2, span,      b & b {}
					}
				}
			`;

			expect(resolveSelectorInContext(code, '&--mod-mod, &--mod2, span,      b & b')).toStrictEqual([
				{ raw: '&--mod-mod', resolved: '.card__item--mod-mod', inject: '.card__item', offset: 0 },
				{ raw: '&--mod-mod', resolved: '.card__title--mod-mod', inject: '.card__title', offset: 0 },
				{ raw: '&--mod2', resolved: '.card__item--mod2', inject: '.card__item', offset: 12 },
				{ raw: '&--mod2', resolved: '.card__title--mod2', inject: '.card__title', offset: 12 },
				{ raw: 'span', resolved: '.card__item span', inject: '.card__item ', offset: 21 },
				{ raw: 'span', resolved: '.card__title span', inject: '.card__title ', offset: 21 },
				{ raw: 'b & b', resolved: 'b .card__item b', inject: '.card__item', offset: 32 },
				{ raw: 'b & b', resolved: 'b .card__title b', inject: '.card__title', offset: 32 },
			]);
		});

		it('Works with SASS interpolated `&` character', () => {
			const code = `
				.card {
					&__item #{&}__foo {}
					&--mod#{&}--mod2 {}
				}
			`;

			expect(resolveSelectorInContext(code, '&__item #{&}__foo')).toStrictEqual([
				{ raw: '&__item #{&}__foo', resolved: '.card__item .card__foo', inject: '.card', offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '&--mod#{&}--mod2')).toStrictEqual([
				{ raw: '&--mod#{&}--mod2', resolved: '.card--mod.card--mod2', inject: '.card', offset: 0 },
			]);
		});
	});
});
