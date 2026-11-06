import { isEmpty } from '@morev/utils';
import { resolveBemEntities } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities';
import { hasAncestorRule, isAtRule } from '#modules/postcss';
import { parseSelectors } from '#modules/selectors';
import type { Node, Root, Rule } from 'postcss';
import type { Separators } from '#modules/shared';

/**
 * Component block selected from a base declaration or an internal BEM entity.
 */
type BemBlock = {
	/**
	 * Selected base declaration, or the first eligible entity rule when no base exists.
	 */
	rule: Rule;

	/**
	 * Component block name without the class prefix.
	 */
	blockName: string;

	/**
	 * Base block selector, even when inferred from an element or modifier.
	 */
	selector: string;

	/**
	 * Whether every selector in the selected rule ends with an unmodified block class.
	 */
	isBaseDeclaration: boolean;
};

/**
 * Checks whether any ancestor at-rule falls outside the allowed names.
 * Selector rules do not stop the search, and the node itself is excluded.
 *
 * @param   node           Node to inspect.
 * @param   allowedNames   Allowed at-rule names; an empty list disallows all at-rule ancestors.
 *
 * @returns                Whether a disallowed ancestor at-rule exists.
 */
const hasDisallowedAtRuleAncestor = (
	node: Node,
	allowedNames: string[],
) => {
	let ancestor = node.parent;

	while (ancestor) {
		if (isAtRule(ancestor) && !allowedNames.includes(ancestor.name)) return true;
		ancestor = ancestor.parent;
	}

	return false;
};

/**
 * Selects the component's BEM block, preferring the first base declaration.
 *
 * Candidate selectors must end with classes belonging to the same block.
 * Rules nested in another rule or in at-rules other than `@layer` and `@media` are excluded.
 * If no base declaration exists, the first eligible element, modifier, or mixed selector list is used.
 *
 * @param   root         PostCSS `Root` object.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              Selected block with declaration metadata, or `null` when no candidate is found.
 */
export const getBemBlock = (
	root: Root,
	separators: Separators,
): BemBlock | null => {
	let result: BemBlock | null = null;

	root.walkRules((rule) => {
		if (result?.isBaseDeclaration) return;
		if (hasAncestorRule(rule)) return;

		if (hasDisallowedAtRuleAncestor(rule, ['layer', 'media'])) return;

		const blockCandidates = rule.selectors.map((selector) => {
			const lastNode = parseSelectors(selector)[0]?.at(-1);
			if (lastNode?.type !== 'class' || isEmpty(lastNode.value)) return;

			return lastNode.toString();
		});

		// A scenario like `.foo-component, #bar`
		if (isEmpty(blockCandidates) || blockCandidates.includes(undefined)) return;

		const allBemEntities = blockCandidates
			.filter(Boolean)
			.map((source) => resolveBemEntities({ source, separators })[0]);
		if (allBemEntities.some((entity) => !entity)) return;

		// `.foo-component, .foo-component--modifier {}`
		const areAllBlocksSame = allBemEntities
			.every((bemEntity) => bemEntity.block.value === allBemEntities[0].block.value);

		if (!areAllBlocksSame) return;

		const isBaseDeclaration = allBemEntities
			.every((entity) => !entity.element && !entity.modifierName && !entity.modifierValue);
		if (result && !isBaseDeclaration) return;

		const bemBlock = allBemEntities[0].block;
		result = {
			rule,
			blockName: bemBlock.value,
			selector: bemBlock.selector,
			isBaseDeclaration,
		};
	});

	return result;
};
