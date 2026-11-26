import { isUndefined } from '@morev/utils';
import { getPropertyEffects } from '../do-properties-overlap/do-properties-overlap';

/**
 * Finds the first cascade dependency reversed by an explicit ordering policy.
 *
 * @param   original   Source sequence.
 * @param   sorted     Requested permutation.
 * @param   property   Reads declaration names from the sorting units.
 *
 * @returns            The source-ordered conflicting pair, when present.
 */
export const findPropertyOrderConflict = <T>(
	original: readonly T[],
	sorted: readonly T[],
	property: (item: T) => string | undefined,
): [T, T] | undefined => {
	if (original.every((item, index) => item === sorted[index])) return undefined;

	const sourcePositions = new Map(original.map((item, index) => [item, index]));
	const earliestWriter = new Map<string | symbol, number>();
	let first = original.length;
	let second = original.length;

	// Later items in the target can only conflict with this item if they originally preceded it.
	for (let index = sorted.length - 1; index >= 0; index--) {
		const item = sorted[index];
		const name = property(item);
		if (isUndefined(name)) continue;

		const source = sourcePositions.get(item)!;
		const { writes, conflicts } = getPropertyEffects(name);
		if (source < second) {
			let earlier = source;
			for (const effect of conflicts) earlier = Math.min(earlier, earliestWriter.get(effect) ?? source);
			if (earlier < source) {
				first = earlier;
				second = source;
			}
		}
		for (const effect of writes) {
			if (source < (earliestWriter.get(effect) ?? original.length)) earliestWriter.set(effect, source);
		}
	}

	return second < original.length ? [original[first], original[second]] : undefined;
};
