import type { ElementOf } from '@morev/utils';
import type { resolveBemEntities } from '#utils';

/**
 * Resolves the most specific part of a BEM entity (in order of priority):
 * modifier value -> modifier name -> element -> block.
 *
 * Returns the selector fragment (e.g., "&--value") and the corresponding entity type.
 *
 * @param   entity   A BEM entity object resolved from a selector.
 *
 * @returns          A tuple with the selector fragment and entity type.
 */
export const resolveMostSpecificEntity = (
	entity: ElementOf<ReturnType<typeof resolveBemEntities>>,
) => {
	const entityKeys = ['modifierValue', 'modifierName', 'element'] as const;

	for (const key of entityKeys) {
		if (entity[key]) {
			return [
				`&${entity[key].separator}${entity[key].value}`,
				key,
			] as const;
		}
	}

	const { separator, value } = entity.block;
	return [`${separator}${value}`, 'block'] as const;
};
