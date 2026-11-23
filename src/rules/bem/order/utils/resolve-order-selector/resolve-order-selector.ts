import { arraysIntersection, arraysUnion, arrayUnique, deepEqual, isEmpty } from '@morev/utils';
import parser from 'postcss-selector-parser';
import { resolveMostSpecificBemEntities } from '#modules/bem';
import { isPseudoElementNode } from '#modules/postcss';
import { resolveSelectorNodes, selectorNodesToString, splitSelectorCompounds } from '#modules/selectors';
import { normalizeLocalSelector } from '../normalize-local-selector/normalize-local-selector';
import type { AtRule, Rule } from 'postcss';
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
 * Checks an authored selector branch for a Sass placeholder outside functional pseudo arguments.
 *
 * @param   nodes   Top-level nodes of one selector branch.
 *
 * @returns         Whether a simple selector contains an unescaped placeholder.
 */
const hasSassPlaceholder = (nodes: parser.Node[]) => nodes.some((node) => {
	if (node.type !== 'tag' && node.type !== 'class' && node.type !== 'id' && node.type !== 'pseudo') return false;

	// The CSS parser can keep a placeholder in the preceding identifier, as in `.button%control`.
	const identifier = node.type === 'pseudo' ? node.value : node.toString();
	return /(?:^|[^\\])(?:\\\\)*%(?=[\w\P{ASCII}\-\\]|#\{)/u.test(identifier);
});

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

			// Additional classes qualify an ancestor already identified as part of the owning block.
			return entities.some((candidate) => candidate.block.value === owner.block.value);
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
	const lastPseudoElement = pseudoElements.at(-1);
	const pseudoElementStates = lastPseudoElement && target.slice(target.indexOf(lastPseudoElement) + 1)
		.flatMap((part) => (part.type === 'pseudo' ? [part.value, part.toString()] : []));
	const categories: OrderCategory[] = [];
	if (!conditions.length) categories.push('base');
	if (conditions.some((part) => part.type === 'pseudo')) categories.push('pseudo-classes');
	if (conditions.some((part) => part.type === 'class')) categories.push('qualifiers:class');
	if (conditions.some((part) => part.type === 'attribute')) categories.push('qualifiers:attribute');
	if (conditions.some((part) => part.type === 'tag')) categories.push('qualifiers:type');
	if (categories.some((category) => category.startsWith('qualifiers:')) || conditions.some((part) => part.type === 'id')) {
		categories.push('qualifiers');
	}

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
		pseudoElementStates: pseudoElementStates?.length ? pseudoElementStates : undefined,
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
 * @param   node           Authored selector rule or selector-form Sass `@at-root`.
 * @param   separators     Configured BEM separators.
 * @param   knownTargets   Unambiguous targets declared elsewhere in the stylesheet.
 * @param   source         Optional authored branch, resolved in the original rule's context.
 *
 * @returns                Semantic classification, an unsafe boundary, or a generic rule.
 */
const resolveOrderSelector = (
	node: Rule | AtRule,
	separators: Separators,
	knownTargets: Set<string>,
	source?: string,
): SelectorOrder | null | undefined => {
	const branches = resolveSelectorNodes({ node, source });
	if (branches.some(({ resolved }) => selectorNodesToString(resolved).includes('#{'))) return null;

	const authored = source ?? (node.type === 'rule' ? node.selector : node.params);
	if (authored.includes('%')) {
		const placeholders = branches.filter((branch) => hasSassPlaceholder(branch.source));
		if (placeholders.length) {
			if (node.type !== 'rule' || placeholders.length !== branches.length) return undefined;

			return {
				path: [],
				categories: ['sass:placeholders'],
				tokens: [authored],
				localSelectors: [],
				isList: !source && node.selectors.length > 1,
			};
		}
	}

	const selectors = branches.map(({ resolved }) => resolveBranch(resolved, separators, knownTargets));
	// Hoisted lists can move as qualifiers only if every branch qualifies a known BEM subject.
	if (node.type === 'atrule' && selectors.some((selector) => !selector?.categories.includes('qualifiers'))) return null;
	if (selectors.length === 1) return selectors[0];

	// Ordinary selector lists stay atomic without requiring a shared BEM owner.
	if (selectors.length && selectors.every((selector) => selector === undefined)) return undefined;
	const first = selectors[0];
	if (!first || selectors.some((selector) => !selector || !deepEqual(selector.path, first.path))) return null;

	const categorySets = selectors.map((selector) => selector!.categories);
	const commonCategories = arraysIntersection(...categorySets);
	// A shared umbrella still allows the configured order to choose among disjoint qualifier types.
	const categories = commonCategories.some((category) => category !== 'qualifiers')
		? commonCategories
		: arraysUnion(...categorySets);

	return {
		...first,
		categories: categories.toSorted(),
		tokens: [],
		pseudoElementStates: selectors.every((selector) => selector!.pseudoElementStates) ? [] : undefined,
		isList: true,
		localSelectors: arrayUnique(selectors.flatMap((selector) => selector!.localSelectors)),
		relativeSelector: selectors.map((selector) => selector!.relativeSelector).join(','),
	};
};

export { hasSassPlaceholder, resolveOrderSelector };
