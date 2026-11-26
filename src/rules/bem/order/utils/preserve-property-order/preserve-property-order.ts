import { doPropertiesOverlap } from '../do-properties-overlap/do-properties-overlap';
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

	const predecessors = new Map<T, Set<T>>(original.map((item) => [item, new Set<T>()]));

	for (const [index, item] of original.entries()) {
		const name = property(item);
		if (name === undefined) continue;
		for (const previous of original.slice(0, index)) {
			const prior = property(previous);
			if (prior !== undefined && doPropertiesOverlap(prior, name)) predecessors.get(item)!.add(previous);
		}
	}
	const remaining = [...preferred];
	const sorted: T[] = [];
	while (remaining.length) {
		const index = remaining.findIndex((item) => predecessors.get(item)!.size === 0);
		const [next] = remaining.splice(index, 1);
		sorted.push(next);
		for (const dependencies of predecessors.values()) dependencies.delete(next);
	}
	return sorted;
};
