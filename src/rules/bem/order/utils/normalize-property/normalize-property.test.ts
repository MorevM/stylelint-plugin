import { normalizeProperty } from './normalize-property';

describe(normalizeProperty, () => {
	it('Normalizes CSS prefixes, case and historical aliases', () => {
		expect(normalizeProperty('-WebKit-Transform')).toBe('transform');
		expect(normalizeProperty('grid-row-gap')).toBe('row-gap');
		expect(normalizeProperty('WORD-WRAP')).toBe('overflow-wrap');
		expect(normalizeProperty('font-stretch')).toBe('font-width');
	});

	it('Does not normalize case, prefixes or aliases inside variable names', () => {
		expect(normalizeProperty('--Color')).toBe('--Color');
		expect(normalizeProperty('$Color')).toBe('$Color');
		expect(normalizeProperty('--grid-gap')).toBe('--grid-gap');
		expect(normalizeProperty('$word-wrap')).toBe('$word-wrap');
	});

	it('Preserves ordinary property names and unrecognized prefixes', () => {
		expect(normalizeProperty('color')).toBe('color');
		expect(normalizeProperty('-custom-property')).toBe('-custom-property');
		expect(normalizeProperty('constructor')).toBe('constructor');
	});
});
