import { isArray } from '@morev/utils';
import { parseSelectors } from './parse-selectors';

describe(parseSelectors, () => {
	it('Returns array of selector nodes for all selectors by default', () => {
		const result = parseSelectors('.foo, .bar');

		expect(isArray(result)).toBe(true);
		expect(result).toHaveLength(2);

		expect(result[0].toString()).toBe('.foo');
		// This space is a bit awkward, but it's important
		// so that we don't diverge the indexes,
		// since we're working with the original selector
		// and we're building the error indices relative to it.
		expect(result[1].toString()).toBe(' .bar');
	});

	it('Returns empty array for invalid selector by default', () => {
		const result = parseSelectors('*::');

		expect(result).toStrictEqual([]);
	});

	it('Returns Node array with custom `.toString()` method that restores selectors', () => {
		const result = parseSelectors('.foo, .bar span::before');

		expect(typeof result[0].toString).toBe('function');
		expect(result[0].toString()).toBe('.foo');

		expect(typeof result[1].toString).toBe('function');
		expect(result[1].toString()).toBe(' .bar span::before');
	});

	it('Preserves `#{&}` interpolation in complex selector', () => {
		const result = parseSelectors('&--foo#{&}--mod#{&}')[0];

		expect(result.toString()).toBe('&--foo#{&}--mod#{&}');

		expect(result[0].toString()).toBe('&');
		expect(result[2].toString()).toBe('#{&}');
		expect(result[4].toString()).toBe('#{&}');
		expect(result[5]).toBeUndefined();
	});

	it('Preserves `#{&}` interpolation within nested `pseudo` tags', () => {
		const result = parseSelectors('&:not(#{&}--foo#{&}--bar):is(.active)')[0] as any;

		expect(result.toString()).toBe('&:not(#{&}--foo#{&}--bar):is(.active)');

		expect(result[0].toString()).toBe('&');
		expect(result[1].toString()).toBe(':not(#{&}--foo#{&}--bar)');
		expect(result[2].toString()).toBe(':is(.active)');

		const nested = result[1].nodes[0].nodes;

		expect(nested[0].toString()).toBe('#{&}');
		expect(nested[1].toString()).toBe('--foo');
		expect(nested[2].toString()).toBe('#{&}');
		expect(nested[3].toString()).toBe('--bar');
	});

	it('Does not alter non-interpolated selectors', () => {
		const selector = '&--type--mod';
		const nodes = parseSelectors(selector)[0];

		expect(nodes.toString()).toBe('&--type--mod');
	});
});
