import type { BemEntity } from '#modules/bem';

/**
 * Resolves the most specific part of a BEM entity (in order of priority):
 * modifier value -> modifier name -> element -> block.
 *
 * @param   bemEntity   A BEM entity object resolved from a selector.
 *
 * @returns             A tuple with the entity part and entity type.
 */
export const getMostSpecificEntityPart = (bemEntity: BemEntity) => {
	const keysInOrder = ['modifierValue', 'modifierName', 'element', 'block'] as const;

	for (const key of keysInOrder) {
		if (bemEntity[key]) {
			return [bemEntity[key], key] as const;
		}
	}

	return [bemEntity.block, 'block'] as const;
};
