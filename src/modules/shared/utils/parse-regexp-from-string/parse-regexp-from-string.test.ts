import { parseRegExpFromString } from './parse-regexp-from-string';

describe(parseRegExpFromString, () => {
	describe('Valid cases', () => {
		it('Parses a simple regular expression without flags', () => {
			expect(parseRegExpFromString('/abc/')).toStrictEqual({ pattern: 'abc', flags: '' });
		});

		it('Parses a regular expression with flags', () => {
			expect(parseRegExpFromString('/abc/i')).toStrictEqual({ pattern: 'abc', flags: 'i' });
			expect(parseRegExpFromString('/abc/gim')).toStrictEqual({ pattern: 'abc', flags: 'gim' });
		});

		it('Parses a regular expression with an empty pattern', () => {
			expect(parseRegExpFromString('//')).toStrictEqual({ pattern: '', flags: '' });
			expect(parseRegExpFromString('//i')).toStrictEqual({ pattern: '', flags: 'i' });
		});

		it('Parses a regular expression with escaped slashes inside the pattern', () => {
			expect(parseRegExpFromString('/foo\\/bar/i')).toStrictEqual({ pattern: 'foo\\/bar', flags: 'i' });
			expect(parseRegExpFromString('/\\/foo\\/bar\\//g')).toStrictEqual({ pattern: '\\/foo\\/bar\\/', flags: 'g' });
		});

		it('Parses a regular expression with special characters inside the pattern', () => {
			expect(parseRegExpFromString('/^\\d+\\.\\d*$/')).toStrictEqual({ pattern: '^\\d+\\.\\d*$', flags: '' });
		});

		it('Parses a regular expression with escaped slashes and no flags', () => {
			expect(parseRegExpFromString('/a\\/b/')).toStrictEqual({ pattern: 'a\\/b', flags: '' });
		});
	});

	describe('Invalid cases', () => {
		it('Returns null if the string does not start and end with slashes', () => {
			expect(parseRegExpFromString('abc')).toBeNull();
			expect(parseRegExpFromString('/abc')).toBeNull();
			expect(parseRegExpFromString('abc/')).toBeNull();
		});

		it('Returns null for an empty string', () => {
			expect(parseRegExpFromString('')).toBeNull();
		});

		it('Returns null if flags contain invalid characters', () => {
			expect(parseRegExpFromString('/abc/xyz')).toBeNull();
			expect(parseRegExpFromString('/abc/123')).toBeNull();
		});
	});
});
