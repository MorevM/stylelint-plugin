import { isEmpty } from '@morev/utils';
import { resolveMostSpecificBemEntities } from '#modules/bem';
import { isNodeWithin, isSelectorOwnerNode } from '#modules/postcss';
import { createRule, extractSeparators, mergeMessages } from '#modules/rule-utils';
import { getResolvedNodesSourceRange, resolveSelectorNodes, selectorNodesToString, splitSelectorCompounds } from '#modules/selectors';
import { schema } from './no-grouped-entities.schema';
import type { AtRule, Rule } from 'postcss';
import type parser from 'postcss-selector-parser';
import type { ResolvedNode } from '#modules/selectors';
import type { Separators } from '#modules/shared';

const IGNORED_FUNCTIONAL_PSEUDOS = new Set([':has', ':is', ':not', ':where']);

type SourceRange = {
	/**
	 * End index in the selector source.
	 */
	endIndex: number;

	/**
	 * Start index in the selector source.
	 */
	index: number;
};

type BranchAnalysis = {
	/**
	 * Whether at least one resolution path has no unambiguous target.
	 */
	isAmbiguous: boolean;

	/**
	 * Range of the complete authored selector-list branch.
	 */
	range: SourceRange;

	/**
	 * Unique resolved targets and their authored source ranges.
	 */
	targets: Map<string, SourceRange>;
};

type SelectorListAnalysis = {
	/**
	 * First authored range of every distinct BEM target in source order.
	 */
	targets: Map<string, SourceRange>;

	/**
	 * Selector-owning PostCSS node.
	 */
	node: Rule | AtRule;
};

/**
 * Detects selector lists nested inside functional pseudo-classes.
 * Their branches are intentionally outside the initial ownership model.
 *
 * @param   nodes   Selector nodes to inspect recursively.
 *
 * @returns         Whether an ignored nested selector list is present.
 */
const hasIgnoredFunctionalSelectorList = (nodes: parser.Node[]): boolean => {
	return nodes.some((node) => {
		if (
			node.type === 'pseudo'
			&& IGNORED_FUNCTIONAL_PSEUDOS.has(node.value)
			&& (node.nodes?.length ?? 0) > 1
		) return true;

		if (!('nodes' in node) || isEmpty(node.nodes)) return false;

		return node.nodes.some((child) => hasIgnoredFunctionalSelectorList([child]));
	});
};

/**
 * Resolves one unambiguous BEM target from an authored selector-list branch.
 * The most specific entity from the rightmost compound owns the declarations.
 *
 * @param   source       Authored selector branch.
 * @param   resolved     Resolved selector branch.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              Canonical BEM identity and its authored source range, or `null`.
 */
const resolveBranchTarget = (
	source: parser.Node[],
	resolved: ResolvedNode[],
	separators: Separators,
) => {
	if (
		selectorNodesToString(resolved).includes('#{')
		|| hasIgnoredFunctionalSelectorList(source)
		|| hasIgnoredFunctionalSelectorList(resolved)
	) return null;

	const targetCompound = splitSelectorCompounds(resolved).at(-1);
	if (!targetCompound) return null;

	const entities = resolveMostSpecificBemEntities({
		nodes: targetCompound,
		separators,
	});
	if (entities.length !== 1) return null;

	const [{ bemSelector: entity }] = entities;
	const targetNode = targetCompound.findLast((node) => {
		return node.type === 'class' && node.value === entity.slice(1);
	});
	if (!targetNode) return null;

	const range = getResolvedNodesSourceRange([targetNode]);
	if (!range) return null;

	return { entity, range };
};

/**
 * Resolves unambiguous BEM targets from the authored branches of one selector list.
 * Parent selector-list expansions are collapsed back into their authored branches.
 *
 * @param   node         Selector-owning PostCSS node.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              Selector-list analysis, or `null` when no target can be resolved.
 */
const analyzeSelectorList = (
	node: Rule | AtRule,
	separators: Separators,
): SelectorListAnalysis | null => {
	const branches = new Map<string, BranchAnalysis>();

	for (const { resolved, source } of resolveSelectorNodes({ node })) {
		const branchRange = getResolvedNodesSourceRange(resolved);
		if (!branchRange) continue;

		const branchKey = `${branchRange.index}:${branchRange.endIndex}`;
		const branch = branches.get(branchKey) ?? {
			isAmbiguous: false,
			range: branchRange,
			targets: new Map<string, SourceRange>(),
		};
		branches.set(branchKey, branch);

		const target = resolveBranchTarget(source, resolved, separators);
		if (!target) {
			branch.isAmbiguous = true;
			continue;
		}

		branch.targets.set(target.entity, target.range);
	}

	const targets = new Map<string, SourceRange>();
	const unambiguousBranches = [...branches.values()]
		.filter((branch) => !branch.isAmbiguous && branch.targets.size === 1)
		.toSorted((a, b) => a.range.index - b.range.index);

	for (const branch of unambiguousBranches) {
		const [[entity, range]] = branch.targets;
		if (!targets.has(entity)) targets.set(entity, range);
	}
	if (targets.size === 0) return null;

	return { node, targets };
};

export default createRule({
	scope: 'bem',
	name: 'no-grouped-entities',
	meta: {
		description: 'Prevents BEM entities from having both grouped and separate declarations.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		grouped: (entity: string, owner: string) =>
			`Unexpected BEM entity "${entity}" grouped with "${owner}". Declare each entity in a separate rule.`,
		redeclared: (entity: string, line: number) =>
			`Unexpected BEM entity "${entity}" grouped here; another declaration occurs at line ${line}. Extract it into its own rule.`,
	},
	schema,
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);
	const analyses: SelectorListAnalysis[] = [];

	// Collect all selector-list analyses before reporting.
	// Default behavior needs the complete registry
	// to find declarations outside each group.
	root.walk((node) => {
		if (!isSelectorOwnerNode(node)) return;

		const analysis = analyzeSelectorList(node, separators);
		if (analysis) analyses.push(analysis);
	});

	if (secondary.strict) {
		// Use the first distinct target as a reference
		// and report every later target against it.
		for (const analysis of analyses) {
			const targets = [...analysis.targets];
			const [firstTarget] = targets;
			if (!firstTarget) continue;

			const [owner] = firstTarget;

			for (const [entity, range] of targets.slice(1)) {
				report({
					...range,
					node: analysis.node,
					message: messages.grouped(entity, owner),
					messageArgs: ['grouped', entity, owner],
				});
			}
		}
		return;
	}

	// States and pseudo-elements of one entity collapse
	// to a single target and do not form a group.
	for (const analysis of analyses) {
		if (analysis.targets.size < 2) continue;

		for (const [entity, range] of analysis.targets) {
			// Descendants remain owned by the original group
			// and do not count as separate declarations.
			const redeclaration = analyses.find((candidate) => {
				return !isNodeWithin(candidate.node, analysis.node, { inclusive: true })
					&& candidate.targets.has(entity);
			});
			const redeclarationRange = redeclaration?.targets.get(entity);

			if (redeclaration && redeclarationRange) {
				// Reference the matching target's line
				// instead of the start of its selector-owning rule.
				const redeclarationLine = redeclaration.node
					.positionBy({ index: redeclarationRange.index }).line;

				report({
					...range,
					node: analysis.node,
					message: messages.redeclared(entity, redeclarationLine),
					messageArgs: ['redeclared', entity, redeclarationLine],
				});
			}
		}
	}
});
