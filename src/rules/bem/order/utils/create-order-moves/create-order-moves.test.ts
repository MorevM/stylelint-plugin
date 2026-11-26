import { arrayInsertMutable, arrayRemoveMutable } from '@morev/utils';
import scss from 'postcss-scss';
import { createOrderMoves } from './create-order-moves';
import type { Rule } from 'postcss';

describe(createOrderMoves, () => {
	const root = scss.parse(`
		.host {
			.a {}
			.b {}
			.c {}
			.d {}
		}
	`);
	const items = (root.first as Rule).nodes.map((node) => ({ node, nodes: [node] }));
	const [a, b, c, d] = items;

	const expectFinalOrder = (sorted: typeof items) => {
		const actual = [...items];
		for (const move of createOrderMoves(items, sorted)) {
			for (const item of move.items) arrayRemoveMutable(actual, item);
			const insertionIndex = actual.indexOf(move.anchor) + Number(move.position === 'after');
			arrayInsertMutable(actual, insertionIndex, ...move.items);
		}

		expect(actual).toStrictEqual(sorted);
	};

	it('Moves one item instead of moving the longer retained run', () => {
		expect(createOrderMoves(items, [b, c, d, a])).toStrictEqual([
			{ items: [a], anchor: d, position: 'after' },
		]);
	});

	it('Moves a contiguous run together and retains the earlier run when their sizes tie', () => {
		expect(createOrderMoves(items, [c, d, a, b])).toStrictEqual([
			{ items: [c, d], anchor: a, position: 'before' },
		]);
	});

	it('Swaps two independent pairs around retained anchors', () => {
		const sorted = [b, a, d, c];

		expect(createOrderMoves(items, sorted)).toStrictEqual([
			{ items: [b], anchor: a, position: 'before' },
			{ items: [d], anchor: a, position: 'after' },
		]);

		expectFinalOrder(sorted);
	});

	it('Moves items to both ends while retaining the middle run', () => {
		const sorted = [d, b, c, a];

		expect(createOrderMoves(items, sorted)).toStrictEqual([
			{ items: [d], anchor: b, position: 'before' },
			{ items: [a], anchor: c, position: 'after' },
		]);

		expectFinalOrder(sorted);
	});

	it('Reverses the region using previously moved items as subsequent anchors', () => {
		const sorted = [d, c, b, a];

		expect(createOrderMoves(items, sorted)).toStrictEqual([
			{ items: [d], anchor: a, position: 'before' },
			{ items: [c], anchor: d, position: 'after' },
			{ items: [b], anchor: c, position: 'after' },
		]);

		expectFinalOrder(sorted);
	});

	it('Does not produce moves for unchanged or empty regions', () => {
		expect(createOrderMoves(items, [...items])).toStrictEqual([]);
		expect(createOrderMoves([], [])).toStrictEqual([]);
	});
});
