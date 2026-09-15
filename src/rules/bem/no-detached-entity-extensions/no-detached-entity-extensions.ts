import { isEmpty } from '@morev/utils';
import { getBemBlock, resolveMostSpecificBemEntities } from '#modules/bem';
import { isSelectorOwnerNode } from '#modules/postcss';
import { createRule, extractSeparators, isCssFile, mergeMessages } from '#modules/rule-utils';
import { getResolvedNodesSourceRange, resolveSelectorNodes, selectorNodesToString, splitSelectorCompounds } from '#modules/selectors';
import { schema } from './no-detached-entity-extensions.schema';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem';
import type { Separators } from '#modules/shared';

const AMBIGUOUS_FUNCTIONAL_PSEUDOS = new Set([':has', ':is', ':not', ':where']);

/**
 * Checks whether a selector contains a functional pseudo-class with multiple branches.
 * Such branches cannot provide one unambiguous entity extension or owner.
 *
 * @param   nodes   Selector nodes to inspect recursively.
 *
 * @returns         Whether an ambiguous functional selector list is present.
 */
const hasAmbiguousFunctionalSelectorList = (nodes: parser.Node[]): boolean => {
	return nodes.some((node) => {
		if (
			node.type === 'pseudo'
			&& AMBIGUOUS_FUNCTIONAL_PSEUDOS.has(node.value)
			&& (node.nodes?.length ?? 0) > 1
		) return true;

		if (!('nodes' in node) || isEmpty(node.nodes)) return false;

		return node.nodes.some((child) => hasAmbiguousFunctionalSelectorList([child]));
	});
};

/**
 * Resolves one direct BEM entity from a selector compound.
 *
 * @param   compound     Selector compound to analyze.
 * @param   blockName    Optional BEM block whose entities participate in the rule.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              The resolved entity and its class node, or `null`.
 */
const resolveCompoundEntity = (
	compound: parser.Node[],
	blockName: string | undefined,
	separators: Separators,
) => {
	if (hasAmbiguousFunctionalSelectorList(compound)) return null;

	const entities = resolveMostSpecificBemEntities({
		blockName,
		nodes: compound,
		separators,
	});
	if (entities.length !== 1) return null;

	const [entity] = entities;
	const entityNode = compound.findLast((node) => {
		return node.type === 'class' && node.value === entity.bemSelector.slice(1);
	});
	if (!entityNode) return null;

	return { entity, entityNode };
};

/**
 * Returns the block or element extended by a modifier.
 *
 * @param   entity   BEM modifier or modifier value.
 *
 * @returns          Selector of its base block or element.
 */
const getBaseEntitySelector = (entity: BemEntity) => {
	return `${entity.block.selector}${entity.element?.selector ?? ''}`;
};

/**
 * Returns the modifier-name selector extended by a modifier value.
 *
 * @param   entity   BEM modifier value.
 *
 * @returns          Selector of its modifier name.
 */
const getModifierNameSelector = (entity: BemEntity) => {
	return `${getBaseEntitySelector(entity)}${entity.modifierName?.selector ?? ''}`;
};

export default createRule({
	scope: 'bem',
	name: 'no-detached-entity-extensions',
	meta: {
		description: 'Requires extensions of a BEM entity selector to be declared within that entity.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		detached: (extension: string, owner: string) =>
			`Expected BEM entity extension "${extension}" to be declared within "${owner}".`,
	},
	schema,
}, (primary, secondary, { report, messages: ruleMessages, result, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);
	const bemBlock = getBemBlock(root, separators);

	const syntaxFunctionNames = [result.opts.syntax?.parse?.name, result.opts.syntax?.stringify?.name]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	const hasScssSyntax = syntaxFunctionNames.includes('scss');
	const isCss = isCssFile(root) || (!root.source?.input.file && !hasScssSyntax);

	root.walk((node) => {
		if (!isSelectorOwnerNode(node)) return;

		const reportedViolations = new Set<string>();

		resolveSelectorNodes({ node }).forEach(({ lexicalParent, resolved }) => {
			if (selectorNodesToString(resolved).includes('#{')) return;

			const compounds = splitSelectorCompounds(resolved);
			if (compounds.length !== 1) return;

			const compound = compounds[0];
			const target = resolveCompoundEntity(compound, bemBlock?.blockName, separators);
			if (!target) return;

			const { entity, entityNode } = target;
			const ancestorEntitySelectors = new Set<string>();
			if (entity.modifierName) ancestorEntitySelectors.add(getBaseEntitySelector(entity));
			if (entity.modifierValue) ancestorEntitySelectors.add(getModifierNameSelector(entity));

			const hasLocalExtension = compound.some((compoundNode) => {
				if (compoundNode === entityNode || compoundNode.type === 'comment') return false;

				return compoundNode.type !== 'class'
					|| !ancestorEntitySelectors.has(`.${compoundNode.value}`);
			});

			let expectedOwners: string[];
			if (hasLocalExtension) {
				expectedOwners = [entity.bemSelector];
			} else if (!isCss && entity.modifierValue) {
				expectedOwners = [getBaseEntitySelector(entity), getModifierNameSelector(entity)];
			} else if (!isCss && entity.modifierName) {
				expectedOwners = [getBaseEntitySelector(entity)];
			} else {
				return;
			}

			let owner: string | undefined;
			if (lexicalParent) {
				if (
					selectorNodesToString(lexicalParent).includes('#{')
					|| hasAmbiguousFunctionalSelectorList(lexicalParent)
				) return;

				const ownerCompound = splitSelectorCompounds(lexicalParent).at(-1);
				if (!ownerCompound) return;

				const ownerEntities = resolveMostSpecificBemEntities({
					blockName: entity.block.value,
					nodes: ownerCompound,
					separators,
				});
				if (ownerEntities.length !== 1) return;

				owner = ownerEntities[0].bemSelector;
			}

			if (owner && expectedOwners.includes(owner)) return;

			const sourceRange = getResolvedNodesSourceRange(compound);
			if (!sourceRange) return;

			const extension = selectorNodesToString(compound);
			const expectedOwner = expectedOwners[0];
			const violationKey = [sourceRange.index, sourceRange.endIndex, extension, expectedOwner].join(':');
			if (reportedViolations.has(violationKey)) return;
			reportedViolations.add(violationKey);

			report({
				...sourceRange,
				node,
				message: messages.detached(extension, expectedOwner),
				messageArgs: ['detached', extension, expectedOwner],
			});
		});
	});
});
