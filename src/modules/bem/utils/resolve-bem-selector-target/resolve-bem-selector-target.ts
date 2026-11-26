import { isEmpty } from '@morev/utils';
import { resolveMostSpecificBemEntities } from '#modules/bem/utils/resolve-most-specific-bem-entities/resolve-most-specific-bem-entities';
import { selectorNodesToString, splitSelectorCompounds } from '#modules/selectors';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem/types';
import type { Separators } from '#modules/shared';

/**
 * Distinguishes a known target, its absence, and selectors whose ownership cannot be determined.
 */
type SelectorTarget<Node extends parser.Node> = {
	/**
	 * A direct BEM class uniquely identifies the target.
	 */
	status: 'resolved';

	/**
	 * Rightmost compound whose entity receives the declarations, with original nodes preserved.
	 */
	compound: Node[];

	/**
	 * Preceding compounds in source order; empty for a local selector.
	 */
	context: Node[][];

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
 * Resolves the direct BEM target of the rightmost compound in one resolved selector branch.
 * Preceding compounds describe its context and never supply a missing target.
 * Without a direct class, top-level `:is()` and `:where()` leave the target unknown, even with a single branch.
 * `:not()` and `:has()` only constrain a target and never supply its BEM identity.
 *
 * @param   nodes        Nodes of one resolved selector branch.
 * @param   separators   Separators used to parse BEM entities.
 *
 * @returns              Target status, with its compound, context, entity, and original class node when resolved.
 */
export const resolveBemSelectorTarget = <Node extends parser.Node>(
	nodes: Node[],
	separators: Separators,
): SelectorTarget<Node> => {
	// Unresolved Sass interpolation anywhere in the branch prevents reliable ownership checks.
	if (selectorNodesToString(nodes).includes('#{')) return { status: 'unknown' };

	const compounds = splitSelectorCompounds(nodes);
	const compound = compounds.at(-1);
	// Missing selector content does not establish the absence of a BEM owner.
	if (!compound) return { status: 'unknown' };

	const directNodes = compound.filter((node) => node.type === 'class');
	if (isEmpty(directNodes)) {
		const hasIndirectTarget = compound.some((node) => {
			return node.type === 'pseudo' && [':is', ':where'].includes(node.value.toLowerCase());
		});
		return { status: hasIndirectTarget ? 'unknown' : 'none' };
	}

	const entities = resolveMostSpecificBemEntities({ nodes: directNodes, separators });
	if (entities.length !== 1) return { status: 'unknown' };

	const [entity] = entities;
	const entityNode = compound.findLast((node) => {
		return node.type === 'class' && node.value === entity.bemSelector.slice(1);
	});
	if (!entityNode) return { status: 'unknown' };

	return { status: 'resolved', compound, context: compounds.slice(0, -1), entity, entityNode };
};
