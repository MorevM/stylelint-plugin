import { resolveSassVariable } from './resolve-sass-variable';

const vars = {
	'&': '.block__label',
	'$b': '.block',
	'$e': '__label',
	'$m': '--active',
	'$empty': '',
};

describe(resolveSassVariable, () => {
	describe('Plain values', () => {
		it('Resolves a bare word without variables', () => {
			expect(resolveSassVariable('.foo', vars)).toBe('.foo');
		});

		it('Resolves a quoted string literal', () => {
			expect(resolveSassVariable(`'foo'`, vars)).toBe('foo');
			expect(resolveSassVariable(`"bar"`, vars)).toBe('bar');
		});

		it('Resolves a single variable', () => {
			expect(resolveSassVariable('$b', vars)).toBe('.block');
			expect(resolveSassVariable('#{$b}', vars)).toBe('.block');
			expect(resolveSassVariable('#{&}', vars)).toBe('.block__label');
			expect(resolveSassVariable('&', vars)).toBe('.block__label');
		});
	});

	describe('Concatenation with `+`', () => {
		it('Concatenates two plain values', () => {
			expect(resolveSassVariable(`'.block' + '__element'`, vars)).toBe('.block__element');
			expect(resolveSassVariable(`.block + __element`, vars)).toBe('.block__element');
		});

		it('Concatenates two variables', () => {
			expect(resolveSassVariable(`$b + $e`, vars)).toBe('.block__label');
		});

		it('Concatenates variable and literal', () => {
			expect(resolveSassVariable(`$b + '__link'`, vars)).toBe('.block__link');
			expect(resolveSassVariable(`$b + "--link"`, vars)).toBe('.block--link');
		});

		it('Concatenates multiple parts', () => {
			expect(resolveSassVariable(`$b + $e + $m`, vars)).toBe('.block__label--active');
			expect(resolveSassVariable(`$b + '__' + 'link' + $m`, vars)).toBe('.block__link--active');
		});

		it('Handles no spaces around `+`', () => {
			expect(resolveSassVariable(`$b+'__link'`, vars)).toBe('.block__link');
			expect(resolveSassVariable(`.block+__link`, vars)).toBe('.block__link');
			expect(resolveSassVariable(`$b+$e+$m`, vars)).toBe('.block__label--active');
		});

		it('Returns `null` on trailing `+`', () => {
			expect(resolveSassVariable(`$b +`, vars)).toBeNull();
			expect(resolveSassVariable(`$b + $e +`, vars)).toBeNull();
		});

		it('Returns `null` if plus appears as operand', () => {
			// e.g. accidental "++" or malformed stream
			expect(resolveSassVariable(`$b ++ $e`, vars)).toBeNull();
		});
	});

	describe('Interpolation `#{...}`', () => {
		it('Resolves `#{$var}` inside a word', () => {
			expect(resolveSassVariable(`#{$b}__link`, vars)).toBe('.block__link');
			expect(resolveSassVariable(`#{$b}#{$e}#{$m}`, vars)).toBe('.block__label--active');
		});

		it('Resolves `#{&}` inside a word', () => {
			expect(resolveSassVariable(`#{&}--active`, vars)).toBe('.block__label--active');
		});

		it('Resolves multiple interpolations and keeps literal parts', () => {
			expect(resolveSassVariable(`pre-#{$b}--x-#{$e}-post`, vars))
				.toBe('pre-.block--x-__label-post');
		});

		it('Handles empty replacement', () => {
			expect(resolveSassVariable(`#{$empty}foo`, vars)).toBe('foo');
			expect(resolveSassVariable(`foo#{$empty}`, vars)).toBe('foo');
		});

		it('Returns `null` for complex content inside `#{...}`', () => {
			expect(resolveSassVariable(`#{$b + '__x'}`, vars)).toBeNull();
			expect(resolveSassVariable(`#{str-slice($b, 1)}`, vars)).toBeNull();
			expect(resolveSassVariable(`#{1 + 2}`, vars)).toBeNull();
		});

		it('Returns `null` if unresolved interpolation remains', () => {
			// Unknown variable
			expect(resolveSassVariable(`#{$unknown}__x`, vars)).toBeNull();
			// Partially substituted but still has "#{"
			expect(resolveSassVariable(`#{$b}__x#{}`, vars)).toBeNull();
		});
	});

	describe('Mixed cases', () => {
		it('Combines interpolation and `+`', () => {
			expect(resolveSassVariable(`#{$b} + '__link'`, vars)).toBe('.block__link');
			expect(resolveSassVariable(`#{$b} + $e + $m`, vars)).toBe('.block__label--active');
		});

		it('Returns `null` when any operand is unknown', () => {
			expect(resolveSassVariable(`$unknown + '__x'`, vars)).toBeNull();
			expect(resolveSassVariable(`$b + $unknown`, vars)).toBeNull();
			expect(resolveSassVariable(`#{$unknown}__x`, vars)).toBeNull();
		});
	});

	describe('Complex operations (should fail)', () => {
		it('Returns `null` for function calls', () => {
			expect(resolveSassVariable(`my-func($b)`, vars)).toBeNull();
			expect(resolveSassVariable(`darken(#fff, 10%)`, vars)).toBeNull();
			expect(resolveSassVariable(`map.get($m, 'k')`, vars)).toBeNull();
		});

		it('Returns `null` for non-concatenation operators', () => {
			expect(resolveSassVariable(`$b - '__x'`, vars)).toBeNull();
			expect(resolveSassVariable(`$b / 2`, vars)).toBeNull();
			expect(resolveSassVariable(`$b * 2`, vars)).toBeNull();
			expect(resolveSassVariable(`$b % 2`, vars)).toBeNull();
		});

		it('Returns `null` for commas or dividers in value stream', () => {
			expect(resolveSassVariable(`$b, '__x'`, vars)).toBeNull();
		});
	});

	describe('Whitespace and comments', () => {
		it('Ignores spaces and comments between tokens', () => {
			expect(resolveSassVariable(`/*a*/ $b  +  /*b*/ '__x' /*c*/`, vars))
				.toBe('.block__x');
		});
	});
});
