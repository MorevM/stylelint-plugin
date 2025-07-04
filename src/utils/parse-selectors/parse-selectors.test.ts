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

	it('Returns array of selector nodes for first selector when `first` option is `true`', () => {
		const result = parseSelectors('.foo, .bar', { first: true });

		expect(isArray(result)).toBe(true);
		expect(result.toString()).toBe('.foo');
	});

	it('Returns empty array for invalid selector with `first` option', () => {
		const result = parseSelectors('*::', { first: true });

		expect(result).toStrictEqual([]);
	});

	it('Returns empty array for invalid selector by default', () => {
		const result = parseSelectors('*::');

		expect(result).toStrictEqual([]);
	});
});
