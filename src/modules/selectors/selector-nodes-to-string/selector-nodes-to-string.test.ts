import parser from 'postcss-selector-parser';
import { selectorNodesToString } from './selector-nodes-to-string';

const parse = (input: string) =>
	parser().astSync(input).nodes[0].nodes;

describe(selectorNodesToString, () => {
	it('Reconstructs a simple class selector', () => {
		const nodes = parse('.block');

		expect(selectorNodesToString(nodes)).toBe('.block');
	});

	it('Reconstructs an element with modifier', () => {
		const nodes = parse('.block__element--mod');

		expect(selectorNodesToString(nodes)).toBe('.block__element--mod');
	});

	it('Reconstructs complex selectors with combinators', () => {
		const nodes = parse('.block > .block__element:has(.baz:is(button)):hover');

		expect(selectorNodesToString(nodes)).toBe('.block > .block__element:has(.baz:is(button)):hover');
	});

	it('Trims leading and trailing spaces by default', () => {
		const nodes = parse('   .block  ');

		expect(selectorNodesToString(nodes)).toBe('.block');
	});

	it('Preserves whitespace when trim is false', () => {
		const nodes = parse('   .block__element   ');

		expect(selectorNodesToString(nodes, { trim: false })).toBe('   .block__element   ');
	});

	it('Explicitly trims when trim is true', () => {
		const nodes = parse('   .block__element   ');

		expect(selectorNodesToString(nodes, { trim: true })).toBe('.block__element');
	});
});
