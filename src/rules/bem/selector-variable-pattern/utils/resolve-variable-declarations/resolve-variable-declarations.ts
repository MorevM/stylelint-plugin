import { getChildContaining, getRoot, isRoot, isRule, resolveSassDeclarations } from '#modules/postcss';
import { resolveNestedSelector } from '#modules/selectors';
import type { ChildNode, Document, Node, Root, Rule } from 'postcss';
import type { SassVariableBindings } from '#modules/sass';

/**
 * Collects the rule ancestry from the outermost rule to the target rule.
 *
 * Intervening at-rules are excluded from the selector chain,
 * but remain relevant as source-order boundaries between its levels.
 *
 * @param   rule   Target rule.
 *
 * @returns        Target rule and its ancestor rules in outer-to-inner order.
 */
const getRuleChain = (rule: Rule) => {
	const rules: Rule[] = [];
	let current: ChildNode | Document | Node | undefined = rule;

	while (current) {
		if (isRule(current)) rules.unshift(current);
		current = current.parent;
	}

	return rules;
};

/**
 * Resolves direct SASS variable declarations at the stylesheet root or inside a rule.
 *
 * Rule declarations inherit variables through their selector chain while preserving
 * source-order visibility. Root declarations have no selector owner.
 *
 * @param   node   Stylesheet root or rule whose direct declarations should be resolved.
 *
 * @returns        Resolved declarations and owner context, or `null` for a detached
 *                 or ambiguous rule.
 */
export const resolveVariableDeclarations = (node: Root | Rule) => {
	if (isRoot(node)) {
		return {
			declarations: resolveSassDeclarations(node).declarations,
			owner: null,
		};
	}

	const root = getRoot(node);
	if (!root) return null;

	const ruleChain = getRuleChain(node);
	const outerRule = ruleChain[0];
	const rootBoundary = getChildContaining(root, outerRule);
	if (!rootBoundary) return null;

	// Root declarations after the outer branch must not become visible inside it.
	let inheritedVariables: SassVariableBindings = resolveSassDeclarations(root, {
		stopBefore: rootBoundary,
	}).variables;

	for (const [index, currentRule] of ruleChain.entries()) {
		const resolvedSelectors = resolveNestedSelector({ node: currentRule });
		// Multiple resolved selectors would give declarations more than one possible owner.
		if (resolvedSelectors.length !== 1) return null;

		const nextRule = ruleChain[index + 1];
		let stopBefore: ChildNode | undefined;
		if (nextRule) {
			// The direct child may be an at-rule wrapping the next selector level.
			const directChild = getChildContaining(currentRule, nextRule);
			if (!directChild) return null;
			stopBefore = directChild;
		}

		const result = resolveSassDeclarations(currentRule, {
			context: resolvedSelectors[0].resolved,
			inheritedVariables,
			stopBefore,
		});

		if (!nextRule) {
			return {
				declarations: result.declarations,
				owner: {
					selector: resolvedSelectors[0].resolved,
					depth: ruleChain.length,
					path: ruleChain.map(({ selector }) => selector),
				},
			};
		}
		// Only bindings declared before the nested branch are inherited by its rule.
		inheritedVariables = { ...inheritedVariables, ...result.variables };
	}

	return null;
};
