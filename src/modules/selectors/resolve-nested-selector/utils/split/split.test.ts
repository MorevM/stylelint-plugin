import { split } from './split';

describe(split, () => {
	it('Splits by separator with no nesting', () => {
		expect(split('a,b,c', ',', false)).toStrictEqual(['a', 'b', 'c']);
	});

	it('Ignores separators inside parentheses', () => {
		expect(split('a,(b,c),d', ',', false)).toStrictEqual(['a', '(b,c)', 'd']);
	});

	it('Splits inside parentheses when `splitFunctions` is `true`', () => {
		expect(split('a,(b,c),d', ',', true)).toStrictEqual(['a', '(b', 'c)', 'd']);
	});

	it('Ignores separators inside different bracket types', () => {
		expect(split('a,[b,c],{d,e}', ',', false)).toStrictEqual(['a', '[b,c]', '{d,e}']);
	});

	it('Does not split inside quotes', () => {
		expect(split(`a,"b,c",'d,e'`, ',', false)).toStrictEqual(['a', '"b,c"', "'d,e'"]);
	});

	it('Handles nested brackets correctly', () => {
		expect(split('a,(b,(c,d),e),f', ',', false)).toStrictEqual(['a', '(b,(c,d),e)', 'f']);
	});

	it('Allows splitting if all nesting is inside () and `splitFunctions` is `true`', () => {
		expect(split('a,(b,(c,d),e),f', ',', true)).toStrictEqual(['a', '(b', '(c', 'd)', 'e)', 'f']);
	});

	it('Handles escaped quotes inside quoted strings', () => {
		expect(split(`a,"b,\\"c,d\\"",e`, ',', false)).toStrictEqual(['a', '"b,\\"c,d\\""', 'e']);
	});

	it('Handles escaped separator outside quotes', () => {
		expect(split('a\\,b,c', ',', false)).toStrictEqual(['a\\,b', 'c']);
	});

	it('Handles empty string', () => {
		expect(split('', ',', false)).toStrictEqual(['']);
	});

	it('Handles string with no separator', () => {
		expect(split('abc', ',', false)).toStrictEqual(['abc']);
	});

	it('Handles trailing separator', () => {
		expect(split('a,b,c,', ',', false)).toStrictEqual(['a', 'b', 'c', '']);
	});

	it('Handles leading separator', () => {
		expect(split(',a,b,c', ',', false)).toStrictEqual(['', 'a', 'b', 'c']);
	});
});
