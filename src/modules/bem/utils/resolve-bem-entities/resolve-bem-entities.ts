import { arrayUnique, assert, isUndefined, mergeObjects } from '@morev/utils';
import { Rule } from 'postcss';
import { isPseudoElementNode } from '#modules/postcss';
import { parseSelectors, resolveNestedSelector } from '#modules/selectors';
import { getResolvedBemSegments, parseBemEntities } from './utils';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem/types';
import type { Options } from './resolve-bem-entities.types';

/**
 * Checks whether the given partial BEM entity contains all required fields
 * to be treated as a fully valid `BemEntity`.
 *
 * @param   entity   A partially constructed BEM entity.
 *
 * @returns          Whether the entity is complete enough to be treated as valid.
 */
const isValidBemEntity = (entity: Partial<BemEntity>): entity is BemEntity => {
	const requiredProperties = ['block', 'rule', 'bemSelector'] as const;
	for (const property of requiredProperties) {
		if (isUndefined(entity[property])) return false;
	}

	return true;
};

/**
 * Creates a default BEM entity structure with empty context and undefined fields,
 * allowing optional overrides.
 *
 * @param   partialEntity   Optional fields to override in the base structure.
 *
 * @returns                 A partially constructed BEM entity with guaranteed shape.
 */
const createBemEntity = (partialEntity?: Partial<BemEntity>): Partial<BemEntity> => {
	return mergeObjects({
		sourceContext: null,
		block: undefined,
		element: undefined,
		modifierName: undefined,
		modifierValue: undefined,
		context: {
			classes: {
				entities: [],
				modifiers: [],
			},
			tags: [],
			ids: [],
			attributes: [],
			pseudoClasses: [],
			pseudoElements: [],
		},
	}, partialEntity);
};

/**
 * Creates a store for tracking processed pseudo-class nodes in selector trees.
 * This allows linking nested selectors (e.g. within `:is()` or `:has()`) back to
 * their parent pseudo-classes and associated BEM entities.
 *
 * @returns   An object with:
 *    * `markAsSeen(pseudo)`: Registers a pseudo-class node as processed.
 *    * `getParents(node, entities)`: Returns the nearest seen pseudo-class node
 *    and its associated BEM entity, or `[null, null]` if none found.
 */
const createPseudoStore = () => {
	/**
	 * A set of pseudo-class nodes that have been processed already.
	 */
	const seenPseudos = new Set<parser.Pseudo>();

	/**
	 * Traverses upward from a node to find the closest parent pseudo-class node
	 * that has been previously marked as seen.
	 *
	 * @param   node   Selector node to start traversal from.
	 *
	 * @returns        The nearest seen pseudo-class node, or `null` if none found.
	 */
	const getParentPseudo = (node: parser.Node): parser.Pseudo | null => {
		let { parent } = node;

		while (parent) {
			if (seenPseudos.has(parent as parser.Pseudo)) {
				return parent as parser.Pseudo;
			}
			parent = parent.parent;
		}

		return null;
	};

	/**
	 * Resolves the nearest seen pseudo-class and its corresponding BEM entity, if any.
	 *
	 * @param   node                   The node to resolve parents for.
	 * @param   processedBemEntities   All BEM entities processed so far.
	 *
	 * @returns                        A tuple of [pseudoClassNode, parentBemEntity], or [null, null].
	 */
	const getParents = (node: parser.Node, processedBemEntities: BemEntity[]) => {
		const parentPseudo = getParentPseudo(node);
		if (!parentPseudo) return [null, null];

		const parentBemEntity = processedBemEntities.find((entity) => {
			return entity.context.pseudoClasses.includes(parentPseudo);
		}) ?? null;

		return [parentPseudo, parentBemEntity] as const;
	};

	/**
	 * Marks a pseudo-class node as processed for later parent resolution.
	 *
	 * @param   pseudo   A pseudo-class node from `postcss-selector-parser`.
	 */
	const markAsSeen = (pseudo: parser.Pseudo) => {
		seenPseudos.add(pseudo);
	};

	return { markAsSeen, getParents };
};

/**
 * Flattens a BEM entity by extracting
 * directly nested modifier and element entities.
 *
 * @param   bemEntity   The root BEM entity to extract from.
 *
 * @returns             A flat array of the root entity and all nested ones.
 */
const extractNestedBemEntities = (bemEntity: BemEntity) => {
	return [
		bemEntity,
		...bemEntity.context.classes.entities.map((entity) => {
			entity.entity.sourceContext = entity.context;
			return entity.entity;
		}),
		...bemEntity.context.classes.modifiers.map((entity) => {
			entity.entity.sourceContext = entity.context;
			return entity.entity;
		}),
	];
};

/**
 * Extracts all BEM entities from a given selector - either from a PostCSS node
 * (rule or at-rule), or directly from a raw string.
 *
 * Resolves nested selectors (e.g. SCSS `&`, `@nest`, `@at-root`) into fully qualified
 * forms and collects BEM-style class names along with their hierarchy and pseudo-context.
 *
 * @param   options   Either a PostCSS rule with optional selector override,
 *                    or a standalone selector string with no associated node.
 *
 * @returns           A deduplicated flat list of all extracted BEM entities.
 */
export const resolveBemEntities = (options: Options) => {
	const { separators } = options;
	// If no rule is provided (selector-only mode),
	// create a dummy `Rule` node for parsing context.
	const rule = 'rule' in options ? options.rule : new Rule();

	const allBemEntities = resolveNestedSelector({ selector: options.source, node: rule })
		.reduce<BemEntity[]>((acc, {
			raw: matchedSelector,
			resolved: resolvedSelector,
			offset: sourceOffset,
		}) => {
			// `resolveNestedSelector` splits selectors by `,` internally,
			// so it's safe to take the first one directly.
			const sourceSelectorNodes = parseSelectors(matchedSelector)[0];
			const resolvedSelectorNodes = parseSelectors(resolvedSelector)[0];

			const bemNodes = getResolvedBemSegments(
				sourceSelectorNodes,
				resolvedSelectorNodes,
				rule,
			);

			const pseudoStore = createPseudoStore();

			const bemEntities = bemNodes.reduce<BemEntity[]>((processedBemEntities, selectorNodes) => {
				// Start with a fresh context for each selector segment
				let parentBemEntity: BemEntity | null = null;
				let parentPseudo: parser.Pseudo | null = null;
				let bemEntity: Partial<BemEntity> = createBemEntity({ rule });

				for (const node of selectorNodes) {
					assert(bemEntity.context, 'Context is guaranteed at creation time');

					if (node.type === 'tag') {
						bemEntity.context.tags.push(node.toString());
						continue;
					}

					if (node.type === 'id') {
						bemEntity.context.ids.push(node.toString());
						continue;
					}

					if (node.type === 'attribute') {
						bemEntity.context.attributes.push(node.toString());
						continue;
					}

					if (node.type === 'pseudo') {
						if (isPseudoElementNode(node)) {
							bemEntity.context.pseudoElements.push(node.toString());
							continue;
						} else {
							pseudoStore.markAsSeen(node);
							bemEntity.context.pseudoClasses.push(node);
							continue;
						}
					}

					[parentPseudo, parentBemEntity] = pseudoStore.getParents(node, processedBemEntities);

					if (node.type === 'class') {
						const maybeBemEntity = parseBemEntities({ node, rule, sourceOffset, separators });
						// Technically impossible scenario, used solely for TS type narrowing.
						if (!maybeBemEntity) continue;

						// First valid class is treated as the base BEM entity
						if (!bemEntity.block) {
							bemEntity = createBemEntity({ rule, ...maybeBemEntity });
							continue;
						}

						// Later classes within same segment may be modifiers or nested entities
						const [whereToPush, contextName] = maybeBemEntity.block?.value === bemEntity.block.value
							? ['modifiers', 'modifier'] as const
							: ['entities', 'entity'] as const;

						isValidBemEntity(maybeBemEntity) && bemEntity.context.classes[whereToPush].push({
							context: contextName,
							entity: maybeBemEntity,
						});
					}
				}

				if (isValidBemEntity(bemEntity)) {
					// Link the processed entity to its parent
					// to allow more complex validations in rules.
					if (parentBemEntity) {
						const childEntityType = bemEntity.block.value === parentBemEntity.block.value
							? 'modifiers'
							: 'entities';

						parentBemEntity.context.classes[childEntityType].push({
							context: parentPseudo!.value,
							entity: bemEntity,
						});
					}
					processedBemEntities.push(bemEntity);
				}

				return processedBemEntities;
			}, []);

			acc.push(...bemEntities);
			return acc;
		}, []);

	return arrayUnique(
		allBemEntities.flatMap((bemEntity) => extractNestedBemEntities(bemEntity)),
	);
};
