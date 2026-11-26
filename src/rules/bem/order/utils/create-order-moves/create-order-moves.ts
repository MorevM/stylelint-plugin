import type { OrderItem } from '../../order.internal-types';

/**
 * Consecutive authored items that are also consecutive in the target order.
 */
type OrderRun = {
	/**
	 * Nodes that can move together without an internal reorder.
	 */
	items: OrderItem[];

	/**
	 * Original position used to resolve equally good plans deterministically.
	 */
	sourceIndex: number;

	/**
	 * First position occupied by the run in the target sequence.
	 */
	targetIndex: number;

	/**
	 * Number of authored items retained by the best sequence ending here.
	 */
	retainedItems: number;

	/**
	 * Number of retained runs, used to minimize diagnostics after minimizing moved items.
	 */
	retainedRuns: number;

	/**
	 * Previous retained run in that sequence.
	 */
	previous?: OrderRun;
};

/**
 * Chooses the retained sequence that minimizes moved items, then moved runs.
 *
 * @param   first    First candidate sequence endpoint, if available.
 * @param   second   Second candidate sequence endpoint, if available.
 *
 * @returns          Better endpoint, preferring the earlier source position on ties, or undefined.
 */
const selectBetterRun = (first: OrderRun | undefined, second: OrderRun | undefined) => {
	if (!first) return second;
	if (!second) return first;
	const difference = first.retainedItems - second.retainedItems
		|| first.retainedRuns - second.retainedRuns
		|| second.sourceIndex - first.sourceIndex;
	return difference >= 0 ? first : second;
};

/**
 * Minimizes moved authored items, then the number of contiguous runs that must move.
 * The target already encodes family boundaries and stable equal-rank ordering.
 *
 * @param   items    Original uninterrupted region.
 * @param   sorted   Target sequence containing the same item identities.
 *
 * @returns          Relocations in target order, each with an insertion anchor.
 */
export const createOrderMoves = (items: OrderItem[], sorted: OrderItem[]) => {
	if (items.every((item, index) => item === sorted[index])) return [];

	const targetIndexes = new Map(sorted.map((item, index) => [item, index]));
	const runs: OrderRun[] = [];

	for (const [sourceIndex, item] of items.entries()) {
		const targetIndex = targetIndexes.get(item)!;
		const previous = runs.at(-1);
		if (previous && previous.targetIndex + previous.items.length === targetIndex) {
			previous.items.push(item);
			continue;
		}
		runs.push({ items: [item], sourceIndex, targetIndex, retainedItems: 0, retainedRuns: 0 });
	}

	// Retaining any part of a run allows retaining the whole run.
	// A prefix-max tree finds the best preceding sequence in O(log n) per run.
	const best: Array<OrderRun | undefined> = [];
	for (const run of runs) {
		let left = sorted.length;
		let right = left + run.targetIndex;
		while (left < right) {
			if (left % 2) run.previous = selectBetterRun(run.previous, best[left++]);
			if (right % 2) run.previous = selectBetterRun(run.previous, best[--right]);
			left = Math.floor(left / 2);
			right = Math.floor(right / 2);
		}
		run.retainedItems = (run.previous?.retainedItems ?? 0) + run.items.length;
		run.retainedRuns = (run.previous?.retainedRuns ?? 0) + 1;

		let position = sorted.length + run.targetIndex;
		best[position] = run;
		while (position > 1) {
			position = Math.floor(position / 2);
			best[position] = selectBetterRun(best[position * 2], best[position * 2 + 1]);
		}
	}

	const retained = new Set<OrderRun>();
	let firstRetained = sorted.length;
	let run = best[1];
	while (run) {
		retained.add(run);
		firstRetained = Math.min(firstRetained, run.targetIndex);
		run = run.previous;
	}

	return runs.filter((candidate) => !retained.has(candidate))
		.toSorted((a, b) => a.targetIndex - b.targetIndex)
		.map((candidate) => ({
			items: candidate.items,
			anchor: sorted[candidate.targetIndex ? candidate.targetIndex - 1 : firstRetained],
			position: candidate.targetIndex ? 'after' as const : 'before' as const,
		}));
};
