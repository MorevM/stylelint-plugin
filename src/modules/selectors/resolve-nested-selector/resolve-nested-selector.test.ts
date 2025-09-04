import { getRuleBySelector } from '#modules/test-utils';
import { resolveNestedSelector } from './resolve-nested-selector';

const resolveSelectorInContext = (
	code: string,
	selector: string,
	customSelector?: string,
) => {
	return resolveNestedSelector({
		source: customSelector,
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
				{ source: 'a', resolved: 'a', substitutions: null, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, 'b, c')).toStrictEqual([
				{ source: 'b', resolved: 'b', substitutions: null, offset: 0 },
				{ source: 'c', resolved: 'c', substitutions: null, offset: 3 },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'b')).toStrictEqual([
				{ source: 'b', resolved: 'b', substitutions: null, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, 'b, c', 'c')).toStrictEqual([
				{ source: 'c', resolved: 'c', substitutions: null, offset: 0 },
			]);
		});

		it('Resolves deeply nested selectors', () => {
			const code = `a { b, c { d { e, f {}}}}`;

			expect(resolveSelectorInContext(code, 'e, f')).toStrictEqual([
				{ source: 'e', resolved: 'a b d e', substitutions: { '&': 'a b d ' }, offset: 0 },
				{ source: 'e', resolved: 'a c d e', substitutions: { '&': 'a c d ' }, offset: 0 },
				{ source: 'f', resolved: 'a b d f', substitutions: { '&': 'a b d ' }, offset: 3 },
				{ source: 'f', resolved: 'a c d f', substitutions: { '&': 'a c d ' }, offset: 3 },
			]);
		});

		it('Resolves multiple selectors with and without `&` character', () => {
			const code = `
				.foo {
					.bar &, a, & + &:hover {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a, & + &:hover')).toStrictEqual([
				{ source: '.bar &', resolved: '.bar .foo', substitutions: { '&': '.foo' }, offset: 0 },
				{ source: 'a', resolved: '.foo a', substitutions: { '&': '.foo ' }, offset: 8 },
				{ source: '& + &:hover', resolved: '.foo + .foo:hover', substitutions: { '&': '.foo' }, offset: 11 },
			]);
		});

		it('Resolves multiple selectors with and without `&` character individually', () => {
			const code = `
				.foo {
					.bar &, a {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar &, a', '.bar &')).toStrictEqual([
				{ source: '.bar &', resolved: '.bar .foo', substitutions: { '&': '.foo' }, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'a')).toStrictEqual([
				{ source: 'a', resolved: '.foo a', substitutions: { '&': '.foo ' }, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '.bar &, a', 'custom')).toStrictEqual([
				{ source: 'custom', resolved: '.foo custom', substitutions: { '&': '.foo ' }, offset: 0 },
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
				{ source: 'b', resolved: '.bar .foo b', substitutions: { '&': '.bar .foo ' }, offset: 0 },
				{ source: 'b', resolved: '.foo + .foo:hover b', substitutions: { '&': '.foo + .foo:hover ' }, offset: 0 },
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
				{ source: 'c > &', resolved: 'c > .bar .foo', substitutions: { '&': '.bar .foo' }, offset: 0 },
				{ source: 'c > &', resolved: 'c > .foo + .foo:hover', substitutions: { '&': '.foo + .foo:hover' }, offset: 0 },
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
				{ source: 'c > &', resolved: 'c > .bar .foo', substitutions: { '&': '.bar .foo' }, offset: 0 },
				{ source: 'c > &', resolved: 'c > .foo + .foo:hover', substitutions: { '&': '.foo + .foo:hover' }, offset: 0 },
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
				{ source: '> b', resolved: '.foo:hover > b', substitutions: { '&': '.foo:hover ' }, offset: 0 },
				{ source: '> b', resolved: '.foo_bar > b', substitutions: { '&': '.foo_bar ' }, offset: 0 },
			]);
		});

		it('Resolves `:is()` with ampersand', () => {
			const code = `
				.a {
					.b:is(:hover, :focus) &, b, b & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b:is(:hover, :focus) &, b, b &')).toStrictEqual([
				{ source: '.b:is(:hover, :focus) &', resolved: '.b:is(:hover, :focus) .a', substitutions: { '&': '.a' }, offset: 0 },
				{ source: 'b', resolved: '.a b', substitutions: { '&': '.a ' }, offset: 25 },
				{ source: 'b &', resolved: 'b .a', substitutions: { '&': '.a' }, offset: 28 },
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
				{ source: '& .c', resolved: '.b:is(:hover, :focus) .a .c', substitutions: { '&': '.b:is(:hover, :focus) .a' }, offset: 0 },
			]);
		});

		it('Resolves ampersands within `:is()`', () => {
			const code = `
				.foo {
					.bar:is(&, &.active) {}
				}
			`;

			expect(resolveSelectorInContext(code, '.bar:is(&, &.active)')).toStrictEqual([
				{ source: '.bar:is(&, &.active)', resolved: '.bar:is(.foo, .foo.active)', substitutions: { '&': '.foo' }, offset: 0 },
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
				{ source: '& .c', resolved: '.b:not(:hover, :focus) .a .c', substitutions: { '&': '.b:not(:hover, :focus) .a' }, offset: 0 },
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
				{ source: '& .c', resolved: '[a=,] .a .c', substitutions: { '&': '[a=,] .a' }, offset: 0 },
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
				{ source: '& .c', resolved: 'a \\, .a .c', substitutions: { '&': 'a \\, .a' }, offset: 0 },
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
				{ source: '& .c', resolved: '[a=","] .a .c', substitutions: { '&': '[a=","] .a' }, offset: 0 },
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
				{ source: '& .e', resolved: '.b .a .e', substitutions: { '&': '.b .a' }, offset: 0 },
				{ source: '& .e', resolved: '.a .c .e', substitutions: { '&': '.a .c' }, offset: 0 },
				{ source: '& .e', resolved: '.a .d .a .e', substitutions: { '&': '.a .d .a' }, offset: 0 },
			]);
		});

		it('Preserves ampersand inside attribute string', () => {
			const code = `
				.a {
					.b [c="&"] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c="&"] &')).toStrictEqual([
				{ source: '.b [c="&"] &', resolved: '.b [c="&"] .a', substitutions: { '&': '.a' }, offset: 0 },
			]);
		});

		it('Preserves ampersand inside unquoted attribute value', () => {
			const code = `
				.a {
					.b [c=&] & {}
				}
			`;

			expect(resolveSelectorInContext(code, '.b [c=&] &')).toStrictEqual([
				{ source: '.b [c=&] &', resolved: '.b [c=&] .a', substitutions: { '&': '.a' }, offset: 0 },
			]);
		});

		it('Preserves escaped ampersand literal', () => {
			const code = `.a {
				.b \\& + & {
					& .c {}
				}
			}`;

			expect(resolveSelectorInContext(code, '& .c')).toStrictEqual([
				{ source: '& .c', resolved: '.b \\& + .a .c', substitutions: { '&': '.b \\& + .a' }, offset: 0 },
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
				{ source: '&:hover', resolved: '.foo .bar:hover', substitutions: { '&': '.foo .bar' }, offset: 0 },
				{ source: '& b', resolved: '.foo .bar b', substitutions: { '&': '.foo .bar' }, offset: 9 },
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
				{ source: '&.active', resolved: '.foo .bar.active', substitutions: { '&': '.foo .bar' }, offset: 0 },
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
				{ source: '& .baz', resolved: '.foo .bar .baz', substitutions: { '&': '.foo .bar' }, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '& .bar')).toStrictEqual([
				{ source: '& .bar', resolved: '.foo .foo .bar', substitutions: { '&': '.foo .foo' }, offset: 0 },
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
					source: '&:hover:where(.foo--active, .foo-disabled)',
					resolved: '.card:hover:where(.foo--active, .foo-disabled)',
					substitutions: { '&': '.card' },
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
				{ source: '&-value', resolved: '.block__el-value', substitutions: { '&': '.block__el' }, offset: 0 },
				{ source: '&-value', resolved: '.block--mod-value', substitutions: { '&': '.block--mod' }, offset: 0 },
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
				{ source: '.baz &', resolved: '.baz .bar .foo-b', substitutions: { '&': '.bar .foo-b' }, offset: 0 },
				{ source: '&-c', resolved: '.bar .foo-b-c', substitutions: { '&': '.bar .foo-b' }, offset: 8 },
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
				{ source: '&--mod', resolved: '.page--mod', substitutions: { '&': '.page' }, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '&--mod2')).toStrictEqual([
				{ source: '&--mod2', resolved: '.page--mod2', substitutions: { '&': '.page' }, offset: 0 },
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
				{ source: '.bar', resolved: '.bar', substitutions: null, offset: 0 },
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
				{ source: '.bar', resolved: '.bar', substitutions: null, offset: 0 },
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
				{ source: '&__item', resolved: '.bar__item', substitutions: { '&': '.bar' }, offset: 0 },
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
				{ source: '.bar', resolved: '.bar', substitutions: null, offset: 0 },
				{ source: '.baz', resolved: '.baz', substitutions: null, offset: 6 },
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
				{ source: '&--mod-mod', resolved: '.card__item--mod-mod', substitutions: { '&': '.card__item' }, offset: 0 },
				{ source: '&--mod-mod', resolved: '.card__title--mod-mod', substitutions: { '&': '.card__title' }, offset: 0 },
				{ source: '&--mod2', resolved: '.card__item--mod2', substitutions: { '&': '.card__item' }, offset: 12 },
				{ source: '&--mod2', resolved: '.card__title--mod2', substitutions: { '&': '.card__title' }, offset: 12 },
				{ source: 'span', resolved: '.card__item span', substitutions: { '&': '.card__item ' }, offset: 21 },
				{ source: 'span', resolved: '.card__title span', substitutions: { '&': '.card__title ' }, offset: 21 },
				{ source: 'b & b', resolved: 'b .card__item b', substitutions: { '&': '.card__item' }, offset: 32 },
				{ source: 'b & b', resolved: 'b .card__title b', substitutions: { '&': '.card__title' }, offset: 32 },
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
				{ source: '&__item #{&}__foo', resolved: '.card__item .card__foo', substitutions: { '&': '.card', '#{&}': '.card' }, offset: 0 },
			]);

			expect(resolveSelectorInContext(code, '&--mod#{&}--mod2')).toStrictEqual([
				{ source: '&--mod#{&}--mod2', resolved: '.card--mod.card--mod2', substitutions: { '&': '.card', '#{&}': '.card' }, offset: 0 },
			]);
		});

		describe('SASS variables', () => {
			it('Resolves static variables from root and local scope', () => {
				const code = `
					$static: .static;

					.block {
						$local: .local;

						&__el {
							#{$static} {}
							#{$local} {}
						}
					}
				`;

				// Root-level variable in a nested selector
				expect(resolveSelectorInContext(code, '#{$static}')).toStrictEqual([
					{
						source: '#{$static}',
						resolved: '.block__el .static',
						substitutions: {
							'#{$static}': '.static',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);

				// Local variable in the same nested selector
				expect(resolveSelectorInContext(code, '#{$local}')).toStrictEqual([
					{
						source: '#{$local}',
						resolved: '.block__el .local',
						substitutions: {
							'#{$local}': '.local',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves `&` and `#{&}` in nested selector', () => {
				const code = `
					.block {
						&__el {
							#{&} & {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{&} &')).toStrictEqual([
					{
						source: '#{&} &',
						resolved: '.block__el .block__el',
						substitutions: {
							'#{&}': '.block__el',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves chained variables in selector', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};
						$link: #{$b}__link;

						&__link {
							#{$b} {}
							#{$link} {}
						}
					}
				`;

				// $b comes from parent scope: #{&} at .block → ".block"
				expect(resolveSelectorInContext(code, '#{$b}')).toStrictEqual([
					{
						source: '#{$b}',
						resolved: '.block__link .block',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__link ',
						},
						offset: 0,
					},
				]);

				// $link is chained: #{$b}__link at .block → ".block__link"
				expect(resolveSelectorInContext(code, '#{$link}')).toStrictEqual([
					{
						source: '#{$link}',
						resolved: '.block__link .block__link',
						substitutions: {
							'#{$link}': '.block__link',
							'&': '.block__link ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves mixed placeholders with combinators and pseudos', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};
						$link: #{$b}__link;

						&__link {
							#{$b}:hover #{&} #{$static} & {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b}:hover #{&} #{$static} &')).toStrictEqual([
					{
						source: '#{$b}:hover #{&} #{$static} &',
						resolved: '.block:hover .block__link .static .block__link',
						substitutions: {
							'#{$static}': '.static',
							'#{$b}': '.block',
							'#{&}': '.block__link',
							'&': '.block__link',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves shadowed variable from inner scope', () => {
				const code = `
					$var: .root;

					.block {
						$var: .local;

						&__el {
							#{$var} {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$var}')).toStrictEqual([
					{
						source: '#{$var}',
						resolved: '.block__el .local',
						substitutions: {
							'#{$var}': '.local',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Does not leak variables across sibling rules', () => {
				const code = `
					$shared: .shared;

					.block {
						&__a {
							$local: .local-a;
						}

						&__b {
							#{$shared} {}
							#{$local} {}
						}
					}
				`;

				// root-level variable works everywhere
				expect(resolveSelectorInContext(code, '#{$shared}')).toStrictEqual([
					{
						source: '#{$shared}',
						resolved: '.block__b .shared',
						substitutions: {
							'#{$shared}': '.shared',
							'&': '.block__b ',
						},
						offset: 0,
					},
				]);

				// local variable from sibling should NOT resolve here
				expect(resolveSelectorInContext(code, '#{$local}')).toStrictEqual([
					{
						source: '#{$local}',
						resolved: '.block__b #{$local}',
						substitutions: {
							'&': '.block__b ',
						},
						offset: 0,
					},
				]);
			});

			it('Leaves unknown variable interpolation unresolved', () => {
				const code = `
					.block {
						&__el {
							#{$unknown} {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$unknown}')).toStrictEqual([
					{
						source: '#{$unknown}',
						resolved: '.block__el #{$unknown}',
						substitutions: {
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves placeholder at leading, middle and trailing positions', () => {
				const code = `
					.block {
						$b: #{&};

						&__el {
							#{$b} {}
							.x #{$b} .y {}
							.a .b #{$b} {}
						}
					}
				`;

				// Leading
				expect(resolveSelectorInContext(code, '#{$b}')).toStrictEqual([
					{
						source: '#{$b}',
						resolved: '.block__el .block',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);

				// Middle
				expect(resolveSelectorInContext(code, '.x #{$b} .y')).toStrictEqual([
					{
						source: '.x #{$b} .y',
						resolved: '.block__el .x .block .y',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);

				// Trailing
				expect(resolveSelectorInContext(code, '.a .b #{$b}')).toStrictEqual([
					{
						source: '.a .b #{$b}',
						resolved: '.block__el .a .b .block',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves variables inside at-rules', () => {
				const code = `
					.block {
						$b: #{&};

						@media (min-width: 600px) {
							&__el {
								#{$b} & {}
							}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b} &')).toStrictEqual([
					{
						source: '#{$b} &',
						resolved: '.block .block__el',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});

			it('Leaves circular variable references unresolved', () => {
				const code = `
					.block {
						$a: #{$b};
						$b: #{$a};

						&__el {
							#{$a} {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$a}')).toStrictEqual([
					{
						source: '#{$a}',
						resolved: '.block__el #{$a}',
						substitutions: {
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves variables inside functional pseudos like `:is()`', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};

						&__link {
							:is(#{$b}, #{&}, #{$static}) {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, ':is(#{$b}, #{&}, #{$static})')).toStrictEqual([
					{
						source: ':is(#{$b}, #{&}, #{$static})',
						resolved: '.block__link :is(.block, .block__link, .static)',
						substitutions: {
							'#{$b}': '.block',
							'#{&}': '.block__link',
							'#{$static}': '.static',
							'&': '.block__link',
						},
						offset: 0,
					},
				]);
			});

			it('Partially resolves when some variables are unknown', () => {
				const code = `
					.block {
						$b: #{&};

						&__el {
							#{$b} .x #{$unknown} & {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b} .x #{$unknown} &')).toStrictEqual([
					{
						source: '#{$b} .x #{$unknown} &',
						resolved: '.block .x #{$unknown} .block__el',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves variables inside attribute selector and preserves quotes', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};

						&__el {
							[data-ref="#{$b} #{&} #{$static}"] {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '[data-ref="#{$b} #{&} #{$static}"]')).toStrictEqual([
					{
						source: '[data-ref="#{$b} #{&} #{$static}"]',
						resolved: '.block__el [data-ref=".block .block__el .static"]',
						substitutions: {
							'#{$b}': '.block',
							'#{&}': '.block__el',
							'#{$static}': '.static',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves adjacent interpolation inside identifier', () => {
				const code = `
					.block {
						$b: #{&};

						&__el {
							#{$b}__child {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b}__child')).toStrictEqual([
					{
						source: '#{$b}__child',
						resolved: '.block__el .block__child',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it.skip('Resolves variables correctly inside `@at-root`', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};

						&__el {
							@at-root {
								#{$b} & #{$static} {}
							}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b} & #{$static}')).toStrictEqual([
					{
						source: '#{$b} & #{$static}',
						resolved: '.block .block__el .static',
						substitutions: {
							'#{$b}': '.block',
							'#{$static}': '.static',
							'&': '.block__el ',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves variables correctly inside `@at-root (without: media)`', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};

						@media (min-width: 600px) {
							&__el {
								@at-root (without: media) {
									#{$b} & #{$static} {}
								}
							}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b} & #{$static}')).toStrictEqual([
					{
						source: '#{$b} & #{$static}',
						resolved: '.block .block__el .static',
						substitutions: {
							'#{$b}': '.block',
							'#{$static}': '.static',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});

			it('Resolves combined selector into separate results', () => {
				const code = `
					$static: .static;

					.block {
						$b: #{&};

						&__el {
							#{$b} a, & #{$static} b {}
						}
					}
				`;

				expect(resolveSelectorInContext(code, '#{$b} a, & #{$static} b')).toStrictEqual([
					{
						source: '#{$b} a',
						resolved: '.block__el .block a',
						substitutions: {
							'#{$b}': '.block',
							'&': '.block__el ',
						},
						offset: 0,
					},
					{
						source: '& #{$static} b',
						resolved: '.block__el .static b',
						substitutions: {
							'#{$static}': '.static',
							'&': '.block__el',
						},
						offset: 9,
					},
				]);
			});

			it('Resolves selector using custom source', () => {
				const code = `
					.block {
						$b: #{&};
						$link: #{$b}__link;

						&__el {
							& {}
						}
					}
				`;

				expect(
					resolveSelectorInContext(code, '&', '#{$link} &'),
				).toStrictEqual([
					{
						source: '#{$link} &',
						resolved: '.block__link .block__el',
						substitutions: {
							'#{$link}': '.block__link',
							'&': '.block__el',
						},
						offset: 0,
					},
				]);
			});
		});
	});
});
