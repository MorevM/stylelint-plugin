import { isEmpty, isUndefined } from '@morev/utils';
import { resolveBemSelectorTarget } from '#modules/bem';
import { isSelectorOwnerNode } from '#modules/postcss';
import { createRule, extractSeparators, isSassSyntax, mergeMessages } from '#modules/rule-utils';
import { getResolvedNodesSourceRange, resolveSelectorNodes, selectorNodesToString } from '#modules/selectors';
import { toRegExp } from '#modules/shared';
import { schema } from './no-detached-entities.schema';
import { createNestingContext } from './utils/create-nesting-context';
import type { BemEntity } from '#modules/bem';
import type { Owner } from './no-detached-entities.types';

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

/**
 * Formats an owner with its declaration location when known.
 *
 * @param   owner   Canonical owner and its first declaration location.
 *
 * @returns         Owner description for a diagnostic or nesting path.
 */
const formatOwner = (owner: Owner) => {
	const { selector, line } = owner;
	if (selector === 'root') return 'the selector root';
	return isUndefined(line) ? `"${selector}"` : `"${selector}" (declared at line ${line})`;
};

export default createRule({
	scope: 'bem',
	name: 'no-detached-entities',
	meta: {
		description: 'Requires BEM entities and their local extensions to be declared within their lexical owners.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		detached: (
			selector: string,
			owners: readonly Owner[],
			path: readonly Owner[],
		) => {
			if (!isEmpty(path)) {
				const expectedPath = path.map((owner) => formatOwner(owner)).join(' > ');
				return `Expected nesting for "${selector}": ${expectedPath} > "${selector}".`;
			}

			if (owners.some((owner) => owner.selector === 'root')) {
				const placements = owners.map((owner) => {
					return `${owner.selector === 'root' ? 'at' : 'within'} ${formatOwner(owner)}`;
				});
				return `Expected "${selector}" to be declared ${placements.join(' or ')}.`;
			}

			const expectedOwners = owners.map((owner) => formatOwner(owner)).join(' or ');
			return `Expected "${selector}" to be declared within ${expectedOwners}.`;
		},
	},
	schema,
}, (primary, secondary, { report, messages: ruleMessages, result, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);
	const ignoredTargets = secondary.ignore
		.map((pattern) => toRegExp(pattern, { allowWildcard: true }));

	const isSass = isSassSyntax(root, result);
	// Defer ownership checks until all declarations and shared ancestors are known.
	const pendingReports: Array<() => void> = [];
	const isIgnored = (selector: string) => ignoredTargets.some((pattern) => selector.search(pattern) !== -1);

	const nestingContext = createNestingContext(secondary.nesting, isIgnored);

	// First collect declaration evidence and queue candidate violations.
	// Checking ownership after traversal lets later declarations satisfy conditions and supply diagnostic locations.
	root.walk((node) => {
		if (!isSelectorOwnerNode(node)) return;

		const reportedViolations = new Set<string>();

		resolveSelectorNodes({ node }).forEach(({ lexicalParent, resolved }) => {
			const target = resolveBemSelectorTarget(resolved, separators);
			if (target.status !== 'resolved') return;

			const { compound, context, entity, entityNode } = target;
			// Base and modifier classes can describe one entity in the same compound.
			// Exclude those classes when detecting extra states and qualifiers.
			const ancestorEntitySelectors = new Set<string>();
			if (entity.modifierName) ancestorEntitySelectors.add(getBaseEntitySelector(entity));
			if (entity.modifierValue) ancestorEntitySelectors.add(getModifierNameSelector(entity));

			const hasLocalExtension = compound.some((compoundNode) => {
				if (compoundNode === entityNode || compoundNode.type === 'comment') return false;

				return compoundNode.type !== 'class'
					|| !ancestorEntitySelectors.has(`.${compoundNode.value}`);
			});

			// Only explicit entity targets supply locations; context classes and states do not.
			let declarationLine = nestingContext.getDeclarationLine(entity.bemSelector);
			if (!hasLocalExtension && isUndefined(declarationLine)) {
				// An unmapped inherited target has already been registered by its ancestor.
				const entityRange = getResolvedNodesSourceRange([entityNode])!;
				declarationLine = node.positionBy({ index: entityRange.index }).line;
			}
			nestingContext.register(entity, declarationLine, !hasLocalExtension && isEmpty(context));

			// Contextual and ignored declarations still supply evidence for other targets.
			// Only checked single-compound targets proceed; CSS retains local extension checks.
			if (!isEmpty(context)) return;
			if (isIgnored(entity.bemSelector)) return;
			if (!isSass && !hasLocalExtension) return;

			// Use the authored parent: `@at-root` can change emitted ancestry without changing lexical ownership.
			let owner: string | undefined;
			if (lexicalParent) {
				const ownerTarget = resolveBemSelectorTarget(lexicalParent, separators);
				if (ownerTarget.status === 'unknown') return;

				owner = ownerTarget.status === 'resolved' ? ownerTarget.entity.bemSelector : undefined;
			}

			// Capture this branch's lexical owner now, then evaluate its policy against the completed registry.
			pendingReports.push(() => {
				const expectedOwners = hasLocalExtension ? [entity.bemSelector] : nestingContext.getOwners(entity.bemSelector);
				if (isEmpty(expectedOwners)) return;
				if (owner && expectedOwners.includes(owner)) return;
				if (!lexicalParent && expectedOwners.includes('root')) return;

				const sourceRange = getResolvedNodesSourceRange(compound);
				if (!sourceRange) return;

				// One authored selector can expand under several parents; report it once if any expansion fails.
				const selector = selectorNodesToString(compound);
				const violationKey = [sourceRange.index, sourceRange.endIndex].join(':');
				if (reportedViolations.has(violationKey)) return;
				reportedViolations.add(violationKey);

				// Existing owners give a direct destination; otherwise show the shortest chain of missing wrappers.
				const owners = expectedOwners.map((expectedOwner) => ({
					selector: expectedOwner,
					line: nestingContext.getDeclarationLine(expectedOwner),
				}));

				const path = isSass && !expectedOwners.includes('root')
					&& owners.every((expectedOwner) => isUndefined(expectedOwner.line))
					? nestingContext.getOwnerChain(entity.bemSelector, hasLocalExtension)
					: [];

				report({
					...sourceRange,
					node,
					message: messages.detached(selector, owners, path),
					messageArgs: ['detached', selector, owners, path],
				});
			});
		});
	});

	// Resolve queued checks with complete evidence, including later and ignored owner declarations.
	pendingReports.forEach((reportViolation) => reportViolation());
});
