import { arraysIntersection, arraysUnion, arrayUnique, deepEqual, isEmpty } from '@morev/utils';
import parser from 'postcss-selector-parser';
import { resolveMostSpecificBemEntities } from '#modules/bem';
import { isPseudoElementNode } from '#modules/postcss';
import { resolveSelectorNodes, selectorNodesToString, splitSelectorCompounds } from '#modules/selectors';
import { normalizeLocalSelector } from '../normalize-local-selector/normalize-local-selector';
import type { Rule } from 'postcss';
import type { Separators } from '#modules/shared';
import type { Family, SelectorOrder } from '../../order.internal-types';
import type { OrderCategory } from '../../order.types';

/**
 * Serializes selector nodes with consistent formatting for semantic keys and matching.
 *
 * @param   nodes   Selector branch or fragment to serialize.
 *
 * @returns         Selector text without lossless formatting.
 */
const canonicalSelector = (nodes: parser.Node[]) => {
	return parser().processSync(selectorNodesToString(nodes), { lossless: false });
};

/**
 * Resolves one selector branch while keeping conditions inside their owning families.
 * `null` marks unsafe selectors; `undefined` leaves non-BEM rules to authored matchers.
 *
 * @param   resolved       One resolved branch without a selector-list separator.
 * @param   separators     Configured BEM separators.
 * @param   knownTargets   Unambiguous targets declared elsewhere in the stylesheet.
 *
 * @returns                Semantic family path, an unsafe boundary, or a generic rule.
 */
const resolveBranch = (
	resolved: parser.Node[],
	separators: Separators,
	knownTargets: Set<string>,
): SelectorOrder | null | undefined => {
	if (selectorNodesToString(resolved).includes('#{')) return null;

	const compounds = splitSelectorCompounds(resolved);
	const target = compounds.at(-1);
	if (!target) return null;

	const candidates = resolveMostSpecificBemEntities({ nodes: target, separators });
	if (!candidates.length) return undefined;

	const owners = candidates.length === 1
		? candidates
		: candidates.filter((candidate) => knownTargets.has(candidate.bemSelector));
	if (owners.length !== 1) return null;

	const [owner] = owners;
	const path: Family[] = [{ name: owner.block.value, key: owner.block.selector, category: 'rules' }];
	let entity = owner.block.selector;
	for (const part of [owner.element, owner.modifierName, owner.modifierValue]) {
		if (!part) continue;
		entity += part.selector;
		path.push({ name: part.value, key: entity, category: part.type === 'element' ? 'elements' : 'modifiers' });
	}

	const subjectClasses = new Set(path.map((family) => family.key.slice(1)));
	const targetIndex = resolved.indexOf(target[0]);
	const context = resolved.slice(0, targetIndex);
	if (!isEmpty(context)) {
		const isInternal = compounds.slice(0, -1).every((compound) => {
			const entities = compound.flatMap((part) => (part.type === 'class'
				? resolveMostSpecificBemEntities({ nodes: [part], separators })
				: []));
			return entities.length > 0 && entities.every((candidate) => candidate.block.value === owner.block.value);
		});
		path.push({
			name: canonicalSelector(context),
			key: canonicalSelector(context),
			category: isInternal ? 'context:internal' : 'context:external',
		});
	}

	const pseudoElements = target.filter(isPseudoElementNode);
	for (const pseudo of pseudoElements) {
		const name = pseudo.toString().replace(/^:+/u, '::');
		path.push({ name, key: name, category: 'pseudo-elements' });
	}

	const localNodes = target.filter((part) => !(part.type === 'class' && subjectClasses.has(part.value)));
	const conditions = localNodes.filter((part) => !isPseudoElementNode(part));
	const categories: OrderCategory[] = [];
	if (!conditions.length) categories.push('base');
	if (conditions.some((part) => part.type === 'pseudo')) categories.push('pseudo-classes');
	if (conditions.some((part) => part.type === 'class')) categories.push('qualifiers:class');
	if (conditions.some((part) => part.type === 'attribute')) categories.push('qualifiers:attribute');

	// Replace parsed class nodes only; text inside attributes and functional pseudos is untouched.
	const relative = resolved.map((part) => {
		if (target.includes(part) && part.type === 'class' && part.value === owner.bemSelector.slice(1)) {
			return parser.nesting({ value: '&' });
		}
		return part.clone();
	});

	return {
		path,
		categories,
		tokens: conditions.flatMap((part) => (part.type === 'pseudo' ? [part.value, part.toString()] : [part.toString()])),
		localSelectors: [isEmpty(localNodes)
			? ''
			: normalizeLocalSelector(selectorNodesToString(localNodes)) ?? canonicalSelector(localNodes)],
		isList: false,
		relativeSelector: canonicalSelector(relative),
	};
};

/**
 * Keeps a selector list atomic within a shared BEM family, preferring categories common to every branch.
 *
 * @param   node           Authored selector rule.
 * @param   separators     Configured BEM separators.
 * @param   knownTargets   Unambiguous targets declared elsewhere in the stylesheet.
 * @param   source         Optional authored branch, resolved in the original rule's context.
 *
 * @returns                Semantic classification, an unsafe boundary, or a generic rule.
 */
export const resolveOrderSelector = (
	node: Rule,
	separators: Separators,
	knownTargets: Set<string>,
	source?: string,
): SelectorOrder | null | undefined => {
	const branches = resolveSelectorNodes({ node, source });
	const selectors = branches.map(({ resolved }) => resolveBranch(resolved, separators, knownTargets));
	if (selectors.length === 1) return selectors[0];

	// Ordinary selector lists stay atomic without requiring a shared BEM owner.
	if (selectors.length && selectors.every((selector) => selector === undefined)) return undefined;
	const first = selectors[0];
	if (!first || selectors.some((selector) => !selector || !deepEqual(selector.path, first.path))) return null;

	const categorySets = selectors.map((selector) => selector!.categories);
	const commonCategories = arraysIntersection(...categorySets);
	const categories = isEmpty(commonCategories) ? arraysUnion(...categorySets) : commonCategories;

	return {
		...first,
		categories: categories.toSorted(),
		tokens: [],
		isList: true,
		localSelectors: arrayUnique(selectors.flatMap((selector) => selector!.localSelectors)),
		relativeSelector: selectors.map((selector) => selector!.relativeSelector).join(','),
	};
};
