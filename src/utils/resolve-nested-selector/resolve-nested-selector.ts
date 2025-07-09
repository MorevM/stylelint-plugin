import { split } from './utils';
import type { AtRule, ChildNode, Node, Root } from 'postcss';

/**
 * Checks whether the given node is an at-rule that affects selector resolution.
 *
 * @param   rule
 *
 * @returns        Whether the ChildNote is AtRule instance named `nest` or `@at-root`
 */
const isAtRule = (rule: ChildNode): rule is AtRule => {
	return rule.type === 'atrule'
		&& (rule.name === 'nest' || rule.name === 'at-root');
};

/**
 * Recursively resolves a nested selector to its fully expanded form.
 *
 * @param   selector   The (potentially nested) selector string to resolve. May include `&` and commas.
 * @param   node       The current PostCSS AST node where the selector is located.
 * @param   _seen      A Set used internally to prevent infinite recursion on cyclic or repeated inputs.
 *
 * @returns            An array of fully resolved selector strings with all nesting and `&` references expanded.
 */
export const resolveNestedSelector = (
	selector: string,
	node: Node,
	_seen = new Set<string>(),
): string[] => {
	const parent = node.parent as undefined | Root | ChildNode;
	if (!parent || parent.type === 'root') return [selector];

	// Prevent infinite recursion for complex selectors like
	// `.b:is(:hover, :focus) &`
	const key = selector + node.source?.start?.column + node.source?.end?.column;
	if (selector.includes(',') && !_seen.has(key)) {
		return split(selector, ',', false)
			.map((selectorPart) => selectorPart.trim())
			.flatMap((selectorPart) => {
				_seen.add(key);
				return resolveNestedSelector(selectorPart, node, _seen);
			});
	}

	if (parent.type !== 'rule' && !isAtRule(parent)) {
		return resolveNestedSelector(selector, parent);
	}

	const parentSelectors = isAtRule(parent)
		? split(parent.params, ',', false).map((x) => x.trim())
		: parent.selectors;

	return parentSelectors.reduce<string[]>((acc, parentSelector) => {
		if (selector.includes('&')) {
			const newlyResolvedSelectors = resolveNestedSelector(parentSelector, parent)
				.map((resolvedParentSelector) => {
					return split(selector, '&', true).join(resolvedParentSelector);
				});

			acc.push(...newlyResolvedSelectors);
			return acc;
		}

		const combinedSelector = [parentSelector, selector].join(' ');

		acc.push(...resolveNestedSelector(combinedSelector, parent));
		return acc;
	}, []);
};
