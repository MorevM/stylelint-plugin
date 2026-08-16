import { arrayUnique, isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { getBemBlock, isDirectBemEntity, resolveBemEntities } from '#modules/bem';
import { isAtRule, isKeyframesRule, isRule } from '#modules/postcss';
import { createRule, extractSeparators, mergeMessages, vMessagesSchema, vSeparatorsSchema } from '#modules/rule-utils';
import { getResolvedNodesSourceRange, resolveSelectorNodes, selectorNodesToString } from '#modules/selectors';
import type parser from 'postcss-selector-parser';
import type { BemEntity } from '#modules/bem';
import type { Separators } from '#modules/shared';

/**
 * Splits a flat selector branch at top-level combinators.
 * For example, `.block:hover > .block__label` becomes two compounds:
 * `.block:hover` and `.block__label`.
 *
 * Combinators inside functional pseudos remain part of their containing node,
 * so `:has(.foo .bar)` is not split here.
 *
 * @param   nodes   Parsed selector nodes from one branch.
 *
 * @returns         Non-empty compounds in source order.
 */
const splitCompounds = <Node extends parser.Node>(nodes: Node[]) => {
	const compounds: Node[][] = [[]];

	for (const node of nodes) {
		if (node.type === 'combinator') {
			compounds.push([]);
			continue;
		}

		compounds.at(-1)!.push(node);
	}

	return compounds.filter((compound) => !isEmpty(compound));
};

/**
 * Ranks a BEM entity by the number of parts after its block.
 * For example, `.block` has rank 0, `.block__item` has rank 1,
 * and `.block__item--active` has rank 2.
 *
 * @param   entity   Resolved BEM entity.
 *
 * @returns          Structural depth of the entity.
 */
const getEntitySpecificity = (entity: BemEntity) => {
	return [entity.element, entity.modifierName, entity.modifierValue]
		.filter(Boolean).length;
};

/**
 * Resolves the deepest direct BEM entities of the requested block in a compound.
 * For `.block__item.block__item--active:hover`, only
 * `.block__item--active` is returned and treated as the owner.
 *
 * Entities nested inside functional pseudos are contextual conditions rather than owners.
 * For example, `.block:is(.block__item)` is owned by `.block`, not `.block__item`.
 *
 * @param   nodes        Nodes of one selector compound.
 * @param   blockName    BEM block whose entities may participate in ownership.
 * @param   separators   Separators used to parse BEM entities.
 *
 * @returns              Unique selectors at the greatest structural depth.
 */
const getMostSpecificEntities = (
	nodes: parser.Node[],
	blockName: string,
	separators: Separators,
) => {
	const selector = selectorNodesToString(nodes);
	const entities = resolveBemEntities({ source: selector, separators })
		.filter((entity) => entity.block.value === blockName)
		.filter(isDirectBemEntity);
	if (isEmpty(entities)) return [];

	const highestSpecificity = Math.max(...entities.map((entity) => getEntitySpecificity(entity)));
	return arrayUnique(
		entities
			.filter((entity) => getEntitySpecificity(entity) === highestSpecificity)
			.map((entity) => entity.bemSelector),
	);
};

/**
 * Recursively checks for an authored nesting selector.
 * Recursion covers cases such as `:is(&:hover, .is-active)`.
 *
 * @param   nodes   Parsed nodes of the authored selector.
 *
 * @returns         Whether the selector contains a raw `&` at any depth.
 */
const hasNesting = (nodes: parser.Node[]): boolean => {
	return nodes.some((node) => {
		if (node.type === 'nesting') return true;
		if (!('nodes' in node) || isEmpty(node.nodes)) return false;

		return node.nodes.some((child) => hasNesting([child]));
	});
};

export default createRule({
	scope: 'bem',
	name: 'no-misplaced-side-effects',
	meta: {
		description: 'Requires BEM side-effects to be declared within the entity they affect.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		misplaced: (target: string, owner: string | undefined) => owner
			? `Expected side-effect on "${target}" to be declared within its own styles, but found within "${owner}"`
			: `Expected side-effect on "${target}" to be declared within its own styles`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.object({
				separators: vSeparatorsSchema,
				messages: vMessagesSchema({
					misplaced: [v.string(), v.union([v.string(), v.undefined()])],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);
	const bemBlock = getBemBlock(root, separators);
	if (!bemBlock) return;

	root.walk((node) => {
		// Only constructs that can own selectors participate in the rule.
		// Keyframe steps such as `from` and `50%` must never be interpreted as selector ownership.
		if (isKeyframesRule(node)) return;
		if (!isAtRule(node, ['nest', 'at-root']) && !isRule(node)) return;

		const reportedViolations = new Set<string>();

		// Selector lists and parent selector lists expand into separate resolved branches.
		// Each misplaced target is checked independently, e.g.
		// `.block__link { &:hover .block__label, &:focus .block__icon {} }`.
		resolveSelectorNodes({ node }).forEach(({ lexicalParent, replacements, resolved, source }) => {
			const resolvedSelector = selectorNodesToString(resolved);
			// Unknown interpolation such as `#{$unknown}` cannot provide a reliable BEM target.
			if (resolvedSelector.includes('#{')) return;

			// A relation needs at least a source and a target compound.
			// `.block__label:hover` is local state; `.block:hover .block__label` is a relation.
			const compounds = splitCompounds(resolved);
			if (compounds.length < 2) return;

			// A nested state may inherit an already-authored relation:
			// `.block__label { .block:hover & { &:focus {} } }`.
			// The inner `&:focus` resolves to the same relation but does not author it again.
			// Keep selectors with their own combinator and implicit descendants such as
			// `.block__link { .block__label {} }`, represented by a parent injection.
			const hasSourceCombinator = source.some((sourceNode) => sourceNode.type === 'combinator');
			const hasParentInjection = replacements.some(({ type }) => type === 'parent-injection');
			if (!hasSourceCombinator && !hasParentInjection && hasNesting(source)) return;

			// Declarations apply to the rightmost compound.
			// In `.block__link:hover .block__label`, the target is `.block__label`.
			const targetCompound = compounds.at(-1)!;
			const targetEntities = getMostSpecificEntities(
				targetCompound,
				bemBlock.blockName,
				separators,
			);
			// Selectors such as `:is(.block__label, .block__icon)` do not have one unambiguous target.
			if (targetEntities.length !== 1) return;

			const target = targetEntities[0];
			// Map the resolved target back to its authored fragment, including selector-list offsets.
			const sourceRange = getResolvedNodesSourceRange(targetCompound);
			if (!sourceRange) return;

			// Source entities describe the BEM context that affects the target.
			// For `.block__link:hover .block__label`, this resolves to `.block__link`.
			const sourceEntities = compounds.slice(0, -1)
				.flatMap((compound) => getMostSpecificEntities(
					compound,
					bemBlock.blockName,
					separators,
				));
			// `html .block` may define the root block without creating a BEM side-effect.
			// `.theme:hover .block__label` is different: the element is still a detached target.
			if (
				node === bemBlock.rule
				&& target === bemBlock.selector
				&& isEmpty(sourceEntities)
			) return;

			// The lexical parent represents the selector that owns this declaration:
			// `.block__label { .block:hover & {} }` is owned by `.block__label`,
			// while `.block__link { &:hover .block__label {} }` is owned by `.block__link`.
			// It remains `.block__label` through `@at-root`, even when no parent context
			// participates in the emitted selector. A flat relation still has no owner.
			const ownerEntities = lexicalParent
				? getMostSpecificEntities(
					splitCompounds(lexicalParent).at(-1) ?? [],
					bemBlock.blockName,
					separators,
				)
				: [];

			// A parent such as `:is(.block__label, .block__icon)` has no unambiguous owner
			// and is outside this rule's ownership model.
			if (lexicalParent && ownerEntities.length !== 1) return;

			const owner = ownerEntities[0];
			if (owner === target) return;

			// Different resolution paths can converge on the same authored target.
			// Report every source range and ownership pair only once.
			const violationKey = ['misplaced', sourceRange.index, sourceRange.endIndex, target, owner].join(':');
			if (reportedViolations.has(violationKey)) return;
			reportedViolations.add(violationKey);

			report({
				...sourceRange,
				node,
				message: messages.misplaced(target, owner),
				messageArgs: ['misplaced', target, owner],
			});
		});
	});
});
