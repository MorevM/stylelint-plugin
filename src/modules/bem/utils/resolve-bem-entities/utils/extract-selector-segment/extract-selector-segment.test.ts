import { parseSelectors } from '#modules/selectors';
import { extractSelectorSegment } from './extract-selector-segment';

describe(extractSelectorSegment, () => {
	it('Extracts segment from start to first combinator (middle index)', () => {
		const selector = '.a.b.c:hover > d';

		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[2].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.a', '.b', '.c', ':hover']);
	});

	it('Extracts segment after combinator to end', () => {
		const selector = '.a.b > .c:hover';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[3].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.c', ':hover']);
	});

	it('Extracts full segment when no combinators present', () => {
		const selector = '.a.b.c';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[1].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.a', '.b', '.c']);
	});

	it('Extracts single node segment if surrounded by combinators', () => {
		const selector = '> .x +';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[1].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.x']);
	});

	it('Handles index at start of array', () => {
		const selector = '.a.b >';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[0].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.a', '.b']);
	});

	it('Handles index at end of array', () => {
		const selector = '> .a.b';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[2].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.a', '.b']);
	});

	it('Extracts inner segment from `:where(...)` pseudo-class', () => {
		const selector = ':where(.foo.bar) > element';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, selector.indexOf('.foo'));

		expect(result.map((n) => n.toString())).toStrictEqual(['.foo', '.bar']);
	});

	it('Extracts multiple inner segments from `:where(...)` pseudo-class', () => {
		const selector = ':where(.foo.bar, .baz.baz > div) > element';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, selector.indexOf('.baz'));

		expect(result.map((n) => n.toString())).toStrictEqual([' .baz', '.baz']);
	});

	it('Extracts inner segments from nested pseudo-classes', () => {
		const selector = '.block:has(.block:is(button.foo--disabled))';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, selector.indexOf('foo'));

		expect(result.map((n) => n.toString())).toStrictEqual(['button', '.foo--disabled']);
	});

	it('Ignores pseudo-elements like ::before (no .nodes)', () => {
		const selector = '.block::before > .element';
		const nodes = parseSelectors(selector)[0];

		const result = extractSelectorSegment(nodes, nodes[1].sourceIndex);

		expect(result.map((n) => n.toString())).toStrictEqual(['.block', '::before']);
	});
});
