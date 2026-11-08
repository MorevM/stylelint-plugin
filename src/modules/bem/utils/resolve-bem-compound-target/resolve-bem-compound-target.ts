import { isEmpty } from '@morev/utils';
import { resolveMostSpecificBemEntities } from '#modules/bem/utils/resolve-most-specific-bem-entities/resolve-most-specific-bem-entities';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem/types';
import type { Separators } from '#modules/shared';

/**
 * Distinguishes a known target, its absence, and selectors whose ownership cannot be determined.
 */
type CompoundTarget<Node extends parser.Node> = {
	/**
	 * A direct BEM class uniquely identifies the target.
	 */
	status: 'resolved';

	/**
	 * Most-specific direct entity, without pseudo-class conditions.
	 */
	entity: BemEntity;

	/**
	 * Original class node, including any source-mapping metadata.
	 */
	entityNode: Node;
} | {
	/**
	 * `none` has no BEM target; `unknown` must not be treated as a known absence of ownership.
	 */
	status: 'none' | 'unknown';
};

/**
 * Resolves the direct BEM target of a compound independently of its pseudo-class conditions.
 * Without a direct class, top-level `:is()` and `:where()` leave the target unknown, even with a single branch.
 * `:not()` and `:has()` only constrain a target and never supply its BEM identity.
 *
 * @param   nodes        Nodes of one selector compound.
 * @param   separators   Separators used to parse BEM entities.
 *
 * @returns              Target status, with the entity and its last original class node when resolved.
 */
export const resolveBemCompoundTarget = <Node extends parser.Node>(
	nodes: Node[],
	separators: Separators,
): CompoundTarget<Node> => {
	const directNodes = nodes.filter((node) => node.type === 'class');
	if (isEmpty(directNodes)) {
		const hasIndirectTarget = nodes.some((node) => {
			return node.type === 'pseudo' && [':is', ':where'].includes(node.value.toLowerCase());
		});
		return { status: hasIndirectTarget ? 'unknown' : 'none' };
	}

	const entities = resolveMostSpecificBemEntities({ nodes: directNodes, separators });
	if (entities.length !== 1) return { status: 'unknown' };

	const [entity] = entities;
	const entityNode = nodes.findLast((node) => {
		return node.type === 'class' && node.value === entity.bemSelector.slice(1);
	});
	if (!entityNode) return { status: 'unknown' };

	return { status: 'resolved', entity, entityNode };
};
