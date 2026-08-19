import { isEmpty } from '@morev/utils';
import { isDirectBemEntity } from '#modules/bem/utils/is-direct-bem-entity/is-direct-bem-entity';
import { resolveBemEntities } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities';
import { selectorNodesToString } from '#modules/selectors';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem/types';
import type { Separators } from '#modules/shared';

type Options = {
	/**
	 * Optional block whose entities may participate in the result.
	 */
	blockName?: string;

	/**
	 * Nodes of one selector compound.
	 */
	nodes: parser.Node[];

	/**
	 * Separators used to parse BEM entities.
	 */
	separators: Separators;
};

/**
 * Ranks a BEM entity by the number of parts after its block.
 *
 * @param   entity   Resolved BEM entity.
 *
 * @returns          Structural depth of the entity.
 */
const getEntityDepth = (entity: BemEntity) => {
	return [entity.element, entity.modifierName, entity.modifierValue]
		.filter(Boolean).length;
};

/**
 * Resolves the deepest direct BEM entities from one selector compound.
 * Entities nested inside functional pseudo-classes are excluded.
 *
 * @param   options   Selector nodes, BEM separators, and an optional block filter.
 *
 * @returns           Unique entities at the greatest structural depth.
 */
export const resolveMostSpecificBemEntities = (options: Options) => {
	const { blockName, nodes, separators } = options;
	const entities = resolveBemEntities({
		source: selectorNodesToString(nodes),
		separators,
	}).filter(isDirectBemEntity)
		.filter((entity) => blockName === undefined || entity.block.value === blockName);

	if (isEmpty(entities)) return [];

	const greatestDepth = Math.max(...entities.map((entity) => getEntityDepth(entity)));
	const mostSpecificEntities = entities
		.filter((entity) => getEntityDepth(entity) === greatestDepth);

	return [...new Map(
		mostSpecificEntities.map((entity) => [entity.bemSelector, entity]),
	).values()];
};
