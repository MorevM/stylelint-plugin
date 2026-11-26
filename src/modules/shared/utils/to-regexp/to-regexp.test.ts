import { toRegExp } from './to-regexp';

describe(toRegExp, () => {
	describe('When value is already a RegExp', () => {
		it('Copies frozen expressions without inheriting or changing their matching state', () => {
			const regex = /abc/gi;
			regex.lastIndex = 2;
			Object.freeze(regex);
			const result = toRegExp(regex);

			expect(result).not.toBe(regex);
			expect(result).toStrictEqual(/abc/gi);
			expect(result.lastIndex).toBe(0);
			expect('ABC'.search(result)).toBe(0);
			expect('ABC'.search(result)).toBe(0);
			expect(regex.lastIndex).toBe(2);
		});
	});

	describe('When value is a string that looks like a RegExp', () => {
		it('Parses the string and preserves sticky matching at the start of the input', () => {
			const result = toRegExp('/abc/iy');

			expect(result).toStrictEqual(/abc/iy);
			expect('xABC'.search(result)).toBe(-1);
			expect('ABC'.search(result)).toBe(0);
			expect('ABC'.search(result)).toBe(0);
		});
	});

	describe('When value is a string with wildcard and `allowWildcard` is enabled', () => {
		it('Converts `*` to `.*` with proper escaping (1)', () => {
			const result = toRegExp('foo*bar', { allowWildcard: true });

			expect(result).toStrictEqual(new RegExp('^foo.*bar$'));
		});

		it('Converts `*` to `.*` with proper escaping (2)', () => {
			const result = toRegExp('*foo*bar*', { allowWildcard: true });

			expect(result).toStrictEqual(new RegExp('^.*foo.*bar.*$'));
		});

		it('Properly escapes other special characters', () => {
			const result = toRegExp('f.o*b[a]r?', { allowWildcard: true });

			expect(result).toStrictEqual(new RegExp('^f\\.o.*b\\[a\\]r\\?$'));
		});
	});

	describe('When value is a plain string without wildcard', () => {
		it('Escapes special characters and wraps with ^$', () => {
			const result = toRegExp('f.o+b[a]r?');

			expect(result).toStrictEqual(new RegExp('^f\\.o\\+b\\[a\\]r\\?$'));
		});
	});

	describe('When `allowWildcard` is disabled and string contains "*"', () => {
		it('Treats "*" as a literal character', () => {
			const result = toRegExp('foo*bar');

			expect(result).toStrictEqual(new RegExp('^foo\\*bar$'));
		});
	});
});
