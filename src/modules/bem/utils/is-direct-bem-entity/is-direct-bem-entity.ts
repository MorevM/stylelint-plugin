import type { BemEntity } from '#modules/bem';

/**
 * Checks whether a BEM entity belongs directly to its compound selector
 * rather than to a nested functional pseudo-class.
 *
 * @param   entity   BEM entity to inspect.
 *
 * @returns          Whether the entity belongs to the direct compound context.
 */
export const isDirectBemEntity = (entity: BemEntity) => {
	return entity.sourceContext === null
		|| entity.sourceContext === 'entity'
		|| entity.sourceContext === 'modifier';
};
