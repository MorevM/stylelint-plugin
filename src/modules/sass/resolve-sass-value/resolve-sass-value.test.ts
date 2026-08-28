import { resolveSassValue, resolveSassValueWithMeta } from './resolve-sass-value';

const vars = {
	'&': '.block__label',
	'$b': '.block',
	'$e': '__label',
	'$m': '--active',
	'$empty': '',
	'$selector': '.block + .link',
};

describe(resolveSassValue, () => {
	describe('Plain values', () => {
		it('Resolves a bare word without variables', () => {
			expect(resolveSassValue('.foo', vars)).toBe('.foo');
		});

		it('Resolves a quoted string literal', () => {
			expect(resolveSassValue(`'foo'`, vars)).toBe('foo');
			expect(resolveSassValue(`"bar"`, vars)).toBe('bar');
			expect(resolveSassValue(`"#{ $b }__link"`, vars)).toBe('.block__link');
		});

		it('Resolves a single variable', () => {
			expect(resolveSassValue('$b', vars)).toBe('.block');
			expect(resolveSassValue('#{$b}', vars)).toBe('.block');
			expect(resolveSassValue('#{&}', vars)).toBe('.block__label');
			expect(resolveSassValue('&', vars)).toBe('.block__label');
		});

		it('Resolves Sass-equivalent variable names in both directions', () => {
			expect(resolveSassValue('$menu-item', { $menu_item: '.menu__item' }))
				.toBe('.menu__item');
			expect(resolveSassValue('$menu_item', { '$menu-item': '.menu__item' }))
				.toBe('.menu__item');
			expect(resolveSassValue('#{$menu_item}', { '$menu-item': '.menu__item' }))
				.toBe('.menu__item');
		});
	});

	describe('Concatenation with `+`', () => {
		it('Concatenates two plain values', () => {
			expect(resolveSassValue(`'.block' + '__element'`, vars)).toBe('.block__element');
			expect(resolveSassValue(`.block + __element`, vars)).toBe('.block__element');
		});

		it('Concatenates two variables', () => {
			expect(resolveSassValue(`$b + $e`, vars)).toBe('.block__label');
		});

		it('Concatenates variable and literal', () => {
			expect(resolveSassValue(`$b + '__link'`, vars)).toBe('.block__link');
			expect(resolveSassValue(`$b + "--link"`, vars)).toBe('.block--link');
		});

		it('Concatenates multiple parts', () => {
			expect(resolveSassValue(`$b + $e + $m`, vars)).toBe('.block__label--active');
			expect(resolveSassValue(`$b + '__' + 'link' + $m`, vars)).toBe('.block__link--active');
		});

		it('Handles no spaces around `+`', () => {
			expect(resolveSassValue(`$b+'__link'`, vars)).toBe('.block__link');
			expect(resolveSassValue(`.block+__link`, vars)).toBe('.block__link');
			expect(resolveSassValue(`$b+$e+$m`, vars)).toBe('.block__label--active');
		});

		it('Returns `null` on trailing `+`', () => {
			expect(resolveSassValue(`$b +`, vars)).toBeNull();
			expect(resolveSassValue(`$b + $e +`, vars)).toBeNull();
		});

		it('Returns `null` if plus appears as operand', () => {
			// e.g. accidental "++" or malformed stream
			expect(resolveSassValue(`$b ++ $e`, vars)).toBeNull();
		});
	});

	describe('Interpolation `#{...}`', () => {
		it('Resolves `#{$var}` inside a word', () => {
			expect(resolveSassValue(`#{$b}__link`, vars)).toBe('.block__link');
			expect(resolveSassValue(`#{$b}#{$e}#{$m}`, vars)).toBe('.block__label--active');
		});

		it('Resolves whitespace inside simple interpolations', () => {
			expect(resolveSassValue(`#{ $b }__link`, vars)).toBe('.block__link');
			expect(resolveSassValue(`#{ & }--active`, vars)).toBe('.block__label--active');
			expect(resolveSassValue(`#{ $selector }__item`, vars))
				.toBe('.block + .link__item');
			expect(resolveSassValue(`pre-#{ $b }#{ $e }-post`, vars))
				.toBe('pre-.block__label-post');
		});

		it('Resolves `#{&}` inside a word', () => {
			expect(resolveSassValue(`#{&}--active`, vars)).toBe('.block__label--active');
		});

		it('Resolves multiple interpolations and keeps literal parts', () => {
			expect(resolveSassValue(`pre-#{$b}--x-#{$e}-post`, vars))
				.toBe('pre-.block--x-__label-post');
		});

		it('Handles empty replacement', () => {
			expect(resolveSassValue(`#{$empty}foo`, vars)).toBe('foo');
			expect(resolveSassValue(`foo#{$empty}`, vars)).toBe('foo');
		});

		it('Returns `null` for complex content inside `#{...}`', () => {
			expect(resolveSassValue(`#{$b + '__x'}`, vars)).toBeNull();
			expect(resolveSassValue(`#{ $b + '__x' }`, vars)).toBeNull();
			expect(resolveSassValue(`#{str-slice($b, 1)}`, vars)).toBeNull();
			expect(resolveSassValue(`#{1 + 2}`, vars)).toBeNull();
		});

		it('Returns `null` if unresolved interpolation remains', () => {
			// Unknown variable
			expect(resolveSassValue(`#{$unknown}__x`, vars)).toBeNull();
			// Partially substituted but still has "#{"
			expect(resolveSassValue(`#{$b}__x#{}`, vars)).toBeNull();
		});
	});

	describe('Mixed cases', () => {
		it('Combines interpolation and `+`', () => {
			expect(resolveSassValue(`#{$b} + '__link'`, vars)).toBe('.block__link');
			expect(resolveSassValue(`#{$b} + $e + $m`, vars)).toBe('.block__label--active');
		});

		it('Returns `null` when any operand is unknown', () => {
			expect(resolveSassValue(`$unknown + '__x'`, vars)).toBeNull();
			expect(resolveSassValue(`$b + $unknown`, vars)).toBeNull();
			expect(resolveSassValue(`#{$unknown}__x`, vars)).toBeNull();
		});
	});

	describe('Complex operations (should fail)', () => {
		it('Returns `null` for function calls', () => {
			expect(resolveSassValue(`my-func($b)`, vars)).toBeNull();
			expect(resolveSassValue(`darken(#fff, 10%)`, vars)).toBeNull();
			expect(resolveSassValue(`map.get($m, 'k')`, vars)).toBeNull();
		});

		it('Returns `null` for non-concatenation operators', () => {
			expect(resolveSassValue(`$b - '__x'`, vars)).toBeNull();
			expect(resolveSassValue(`$b / 2`, vars)).toBeNull();
			expect(resolveSassValue(`$b * 2`, vars)).toBeNull();
			expect(resolveSassValue(`$b % 2`, vars)).toBeNull();
		});

		it('Returns `null` for commas or dividers in value stream', () => {
			expect(resolveSassValue(`/`, vars)).toBeNull();
			expect(resolveSassValue(`$b, '__x'`, vars)).toBeNull();
		});
	});

	describe('Whitespace and comments', () => {
		it('Ignores spaces and comments between tokens', () => {
			expect(resolveSassValue(`/*a*/ $b  +  /*b*/ '__x' /*c*/`, vars))
				.toBe('.block__x');
		});
	});
});

describe(resolveSassValueWithMeta, () => {
	it('Tracks only literal fragments authored by the current value', () => {
		expect(resolveSassValueWithMeta(`#{$b}__it + 'em'`, vars)).toStrictEqual({
			value: '.block__item',
			literalRanges: [[6, 10], [10, 12]],
		});
	});

	it('Does not treat a referenced selector as a literal fragment', () => {
		expect(resolveSassValueWithMeta('$selector', vars)).toStrictEqual({
			value: '.block + .link',
			literalRanges: [],
		});
	});

	it('Preserves whitespace concatenation and its literal provenance', () => {
		expect(resolveSassValueWithMeta('.theme #{$b}__item', vars)).toStrictEqual({
			value: '.theme .block__item',
			literalRanges: [[0, 6], [6, 7], [13, 19]],
		});
	});
});
