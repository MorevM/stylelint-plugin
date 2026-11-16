import { isUndefined } from '@morev/utils';
import { doPropertiesOverlap } from '../do-properties-overlap/do-properties-overlap';

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
	const positions = new Map(sorted.map((item, index) => [item, index]));

	for (const [index, item] of original.entries()) {
		const name = property(item);
		if (isUndefined(name)) continue;

		for (const previous of original.slice(0, index)) {
			const prior = property(previous);
			if (!isUndefined(prior) && positions.get(previous)! > positions.get(item)! && doPropertiesOverlap(prior, name)) {
				return [previous, item];
			}
		}
	}
	return undefined;
};
