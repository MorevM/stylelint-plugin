import { isEmpty } from '@morev/utils';
import { getMostSpecificEntityPart } from '#modules/bem/utils/get-most-specific-entity-part/get-most-specific-entity-part';
import { resolveBemEntities } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities';
import { isAtRule, isRule } from '#modules/postcss';
import type { AtRule, Rule  } from 'postcss';
import type { BemEntity, EntityType } from '#modules/bem';
import type { Separators } from '#modules/shared';
import type { BemChain } from './resolve-bem-chain.types';

/**
 * Traverses up the parent chain to find the nearest parent rule or at-rule
 * (`@nest`, `@at-root`) that contains at least one valid BEM entity.
 *
 * This is used to resolve hierarchical context when building BEM chains,
 * such as tracing a modifier back to its corresponding element or block.
 *
 * @param   rule         Current PostCSS rule or at-rule to start from.
 * @param   separators   BEM separators used to parse entity parts.
 *
 * @returns              An array of BEM entities from the first matching parent rule,
 *                       or `null` if none found.
 */
const getParentBemEntities = (rule: Rule | AtRule, separators: Separators) => {
	let { parent } = rule;

	while (parent) {
		if (isRule(parent) || isAtRule(parent, ['nest', 'at-root'])) {
			const entities = resolveBemEntities({ rule: parent, separators });
			if (!isEmpty(entities)) return entities;
		}

		// It's safe because PostCSS guarantees that all node types with `.parent`
		// form a tree ending in Root, and we stop at Rule nodes only.
		parent = parent.parent as any;
	}

	return null;
};

/**
 * Builds all valid BEM chains originating from the given rule or at-rule.
 *
 * A BEM chain is a top-down trace of related BEM entities, such as:
 * modifier → element → block. The function handles nested selectors and
 * compound selectors, filtering out repeated combinations.
 *
 * The result may contain multiple chains if multiple BEM selectors are
 * defined in the same rule (e.g. `.block__item, .block__item2`).
 *
 * @example
 * Input SCSS:
 * ```scss
 * .block {
 *   &__item {
 *     &--mod {}
 *   }
 * }
 * ```
 * Output chain:
 * ```ts
 * [
 *   [
 *     { entityType: 'modifierName', entityPart: { value: 'mod', ... }, ... },
 *     { entityType: 'element', entityPart: { value: 'item', ... }, ... },
 *     { entityType: 'block', entityPart: { value: 'block', ... }, ... },
 *   ]
 * ]
 * ```
 *
 * @param   rule         PostCSS rule or at-rule to analyze.
 * @param   separators   BEM separators used to parse entity parts.
 *
 * @returns              Array of BEM chains found under the given rule.
 */
export const resolveBemChain = (
	rule: Rule | AtRule,
	separators: Separators,
): BemChain[] => {
	const currentEntities = resolveBemEntities({ rule, separators });
	if (!currentEntities?.length) return [];

	const collectChains = (
		bemEntities: BemEntity[],
		chain: BemChain,
		previous?: { selector: string; specificPartType: EntityType },
	): BemChain[] => {
		return bemEntities.flatMap((bemEntity) => {
			const [entityPart, entityType] = getMostSpecificEntityPart(bemEntity);
			const { bemSelector } = bemEntity;

			const isDifferentBranch = previous && !previous?.selector.startsWith(bemSelector);

			if (isDifferentBranch) {
				// Special case: block inside block
				// `.bar { .foo { &__item } }` => ['foo__item', '.foo'],
				// `.bar` is not the part of the chain in the case.
				if (previous.specificPartType === 'block' && entityType === 'block') {
					return [chain];
				}
				return [];
			}

			const currentChain = [
				...chain,
				{ entityType, entityPart, bemSelector, rule: bemEntity.rule },
			];

			const parentBemEntities = getParentBemEntities(bemEntity.rule, separators);

			if (!parentBemEntities) return [currentChain];

			return collectChains(
				parentBemEntities,
				currentChain,
				{ selector: bemEntity.bemSelector, specificPartType: entityType },
			);
		});
	};

	return collectChains(currentEntities, []);
};
