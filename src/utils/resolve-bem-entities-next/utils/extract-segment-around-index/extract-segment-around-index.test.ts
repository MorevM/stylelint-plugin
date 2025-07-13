import { extractSegmentAroundIndex } from './extract-segment-around-index';
import type { Node } from 'postcss-selector-parser';

const createNode = (type: string, value: string): Node => ({
	type,
	value,
	toString: () => value,
} as unknown as Node);

describe(extractSegmentAroundIndex, () => {
	it('Extracts segment from start to first combinator (middle index)', () => {
		const nodes: Node[] = [
			createNode('class', 'a'),
			createNode('class', 'b'),
			createNode('class', 'c'),
			createNode('pseudo', ':hover'),
			createNode('combinator', '>'),
			createNode('class', 'd'),
		];

		const result = extractSegmentAroundIndex(nodes, 2);

		expect(result.map((n) => n.toString())).toStrictEqual(['a', 'b', 'c', ':hover']);
	});

	it('Extracts segment after combinator to end', () => {
		const nodes: Node[] = [
			createNode('class', 'a'),
			createNode('class', 'b'),
			createNode('combinator', '>'),
			createNode('class', 'c'),
			createNode('pseudo', ':hover'),
		];

		const result = extractSegmentAroundIndex(nodes, 3);

		expect(result.map((n) => n.toString())).toStrictEqual(['c', ':hover']);
	});

	it('Extracts full segment when no combinators present', () => {
		const nodes: Node[] = [
			createNode('class', 'a'),
			createNode('class', 'b'),
			createNode('class', 'c'),
		];

		const result = extractSegmentAroundIndex(nodes, 1);

		expect(result.map((n) => n.toString())).toStrictEqual(['a', 'b', 'c']);
	});

	it('Extracts single node segment if surrounded by combinators', () => {
		const nodes: Node[] = [
			createNode('combinator', '>'),
			createNode('class', 'x'),
			createNode('combinator', '+'),
		];

		const result = extractSegmentAroundIndex(nodes, 1);

		expect(result.map((n) => n.toString())).toStrictEqual(['x']);
	});

	it('Handles index at start of array', () => {
		const nodes: Node[] = [
			createNode('class', 'a'),
			createNode('class', 'b'),
			createNode('combinator', '>'),
		];

		const result = extractSegmentAroundIndex(nodes, 0);

		expect(result.map((n) => n.toString())).toStrictEqual(['a', 'b']);
	});

	it('handles index at end of array', () => {
		const nodes: Node[] = [
			createNode('combinator', '>'),
			createNode('class', 'a'),
			createNode('class', 'b'),
		];

		const result = extractSegmentAroundIndex(nodes, 2);

		expect(result.map((n) => n.toString())).toStrictEqual(['a', 'b']);
	});
});
