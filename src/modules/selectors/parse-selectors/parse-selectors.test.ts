import { isArray, stripIndent } from '@morev/utils';
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
		expect(result.map((node) => node.sourceIndex)).toStrictEqual([0, 1, 6, 10, 15]);
	});

	// @see https://github.com/postcss/postcss-selector-parser/issues/243
	it('Set proper `sourceIndex` for SASS interpolated selectors', () => {
		const result = parseSelectors('#{$link} #{$b}')[0];

		// #{$link}
		expect(result[0].sourceIndex).toBe(0);
		expect(result[0].source?.start?.column).toBe(1);
		expect(result[0].source?.end?.column).toBe(8);

		// #{$b}
		expect(result[2].sourceIndex).toBe(9);
		expect(result[2].source?.start?.column).toBe(10);
		expect(result[2].source?.end?.column).toBe(14);
	});

	it('Preserves source metadata for nodes following a SASS interpolation', () => {
		const result = parseSelectors('#{$link}:hover &')[0];

		expect(result.map((node) => node.sourceIndex)).toStrictEqual([0, 8, 14, 15]);
		expect(result[1].source).toStrictEqual({
			start: { line: 1, column: 9 },
			end: { line: 1, column: 14 },
		});
	});

	it('Preserves source metadata for multiple interpolations in the same node', () => {
		const selector = 'foo#{$element}bar#{$modifier}baz:hover';
		const tagValue = selector.slice(0, selector.indexOf(':hover'));
		const result = parseSelectors(selector)[0];

		expect(result[0].sourceIndex).toBe(0);
		expect(result[0].source).toStrictEqual({
			start: { line: 1, column: 1 },
			end: { line: 1, column: tagValue.length },
		});
		expect(result[1].sourceIndex).toBe(tagValue.length);
		expect(result.toString()).toBe(selector);
	});

	it('Preserves interpolation and source metadata in class and attribute nodes', () => {
		const selector = '.foo-#{$element}[data-#{$name}="#{$value}"]';
		const result = parseSelectors(selector)[0];

		expect(result[0].type).toBe('class');
		expect(result[0].sourceIndex).toBe(0);
		expect(result[0].source?.end?.column).toBe(16);

		expect(result[1].type).toBe('attribute');
		expect(result[1].sourceIndex).toBe(16);
		expect(result.toString()).toBe(selector);
	});

	it('Preserves interpolation source metadata within functional pseudos', () => {
		const result = parseSelectors(':not(a#{$element}b):hover')[0] as any;
		const nested = result[0].nodes[0].nodes;

		expect(nested[0].sourceIndex).toBe(5);
		expect(nested[0].source).toStrictEqual({
			start: { line: 1, column: 6 },
			end: { line: 1, column: 18 },
		});
		expect(result[1].sourceIndex).toBe(19);
	});

	it('Preserves line and column metadata after a multiline interpolation', () => {
		const selector = stripIndent(`
			#{
			  $link
			}:hover &
		`);
		const result = parseSelectors(selector)[0];

		expect(result.toString()).toBe(selector);
		expect(result[0].source).toStrictEqual({
			start: { line: 1, column: 1 },
			end: { line: 3, column: 1 },
		});
		expect(result[1].sourceIndex).toBe(selector.indexOf(':hover'));
		expect(result[1].source).toStrictEqual({
			start: { line: 3, column: 2 },
			end: { line: 3, column: 7 },
		});
	});

	it('Differentiate between `&` and `#{&}` by type', () => {
		const result = parseSelectors('#{&} &')[0];

		expect(result[0].toString()).toBe('#{&}');
		expect(result[0].type).toBe('tag');

		expect(result[2].toString()).toBe('&');
		expect(result[2].type).toBe('nesting');
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
