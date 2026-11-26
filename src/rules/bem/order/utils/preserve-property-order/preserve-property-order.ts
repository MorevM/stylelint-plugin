import { getPropertyEffects, RESETTABLE_PROPERTIES } from '../do-properties-overlap/do-properties-overlap';
import { findPropertyOrderConflict } from '../find-property-order-conflict/find-property-order-conflict';

/**
 * Applies preferred sorting while retaining source precedence between dependent declarations.
 * Available independent members follow the preferred order rather than lexical property names.
 *
 * @param   original    Source sequence.
 * @param   preferred   Requested permutation of the same objects.
 * @param   property    Reads a declaration name, or undefined for other sorting units.
 *
 * @returns             A stable permutation respecting declaration dependencies.
 */
export const preservePropertyOrder = <T>(
	original: readonly T[],
	preferred: readonly T[],
	property: (item: T) => string | undefined,
): T[] => {
	if (!findPropertyOrderConflict(original, preferred, property)) return [...preferred];

	const size = preferred.length;
	const preferredRanks = new Map(preferred.map((item, rank) => [item, rank]));
	const successors: number[][] = preferred.map(() => []);
	const pending = new Uint32Array(size);
	const latestWriter = new Map<string | symbol, number>();
	const resettableWriters: number[] = [];
	const predecessors = new Set<number>();

	for (const item of original) {
		const name = property(item);
		if (name === undefined) continue;
		const rank = preferredRanks.get(item)!;
		const { writes, conflicts } = getPropertyEffects(name);
		predecessors.clear();
		for (const effect of conflicts) {
			if (effect === RESETTABLE_PROPERTIES) {
				// Each reset waits for every affected writer since the previous reset.
				for (const writer of resettableWriters) predecessors.add(writer);
				resettableWriters.length = 0;
			} else {
				// Writers of the same concrete effect already depend on one another.
				const writer = latestWriter.get(effect);
				if (writer !== undefined) predecessors.add(writer);
			}
		}
		for (const writer of predecessors) successors[writer].push(rank);
		pending[rank] = predecessors.size;
		for (const effect of writes) {
			if (effect === RESETTABLE_PROPERTIES) resettableWriters.push(rank);
			else latestWriter.set(effect, rank);
		}
	}

	// Each subtree stores its earliest available preferred rank. The root always selects the next item.
	const ready = new Uint32Array(2 * size).fill(size);
	for (let rank = 0; rank < size; rank++) {
		if (pending[rank] === 0) ready[size + rank] = rank;
	}
	for (let index = size - 1; index > 0; index--) {
		ready[index] = Math.min(ready[2 * index], ready[2 * index + 1]);
	}

	const updateReady = (rank: number, value: number) => {
		let index = size + rank;
		ready[index] = value;
		while (index > 1) {
			index = Math.floor(index / 2);
			ready[index] = Math.min(ready[2 * index], ready[2 * index + 1]);
		}
	};
	const sorted: T[] = [];
	while (sorted.length < size) {
		const next = ready[1];
		sorted.push(preferred[next]);
		updateReady(next, size);
		for (const rank of successors[next]) {
			pending[rank]--;
			if (pending[rank] === 0) updateReady(rank, rank);
		}
	}
	return sorted;
};
