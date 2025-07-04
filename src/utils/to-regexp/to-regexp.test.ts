import { toRegExp } from './to-regexp';

describe(toRegExp, () => {
	describe('When value is already a RegExp', () => {
		it('Returns the same RegExp instance', () => {
			const regex = /abc/i;

			expect(toRegExp(regex)).toBe(regex);
		});
	});

	describe('When value is a string that looks like a RegExp', () => {
		it('Parses the string and returns equivalent RegExp', () => {
			const result = toRegExp('/abc/i');

			expect(result).toStrictEqual(new RegExp('abc', 'i'));
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
