import { split } from './utils';
import type { AtRule, ChildNode, Node, Root, Rule } from 'postcss';
import type { Options, ResolvedSelector } from './resolve-nested-selector.types';

/**
 * Checks whether the given node is an at-rule that affects selector resolution.
 *
 * @param   node   Node to check.
 *
 * @returns        Whether the ChildNote is AtRule instance named `nest` or `@at-root`
 */
const isAtRule = (node: ChildNode): node is AtRule => {
	return node.type === 'atrule'
		&& (node.name === 'nest' || node.name === 'at-root');
};

/**
 * Checks whether the given node is inside an `@at-root` context.
 *
 * This includes the node itself being an `@at-root` at-rule,
 * or being nested anywhere within an `@at-root` block up the AST.
 *
 * @param   node   The PostCSS node to check.
 *
 * @returns        `true` if the node is inside an `@at-root` context, otherwise `false`.
 */
const isAtRootContext = (node: Node) => {
	if (node.type === 'atrule' && (node as AtRule).name === 'at-root') return true;
	let parent = node.parent as undefined | Root | ChildNode;

	while (parent) {
		if (parent.type === 'atrule' && parent.name === 'at-root') {
			return true;
		}
		parent = parent.parent as any;
	}

	return false;
};

/**
 * Returns a unique key for a selector-node pair based on node source position.
 *
 * @param   selector   Selector being resolved.
 * @param   node       Associated PostCSS node.
 *
 * @returns            Cache key string.
 */
const getCacheKey = (selector: string, node: Node) => {
	const start = [node.source?.start?.line, node.source?.start?.column].join(':');
	const end = [node.source?.end?.line, node.source?.end?.column].join(':');

	return `${selector}@${start}|${end}`;
};

/**
 * Recursively resolves a nested selector to its fully expanded form.
 *
 * @param   options   Resolver options.
 *
 * @returns           An array of fully resolved selector strings
 *                    with all nesting and `&` references expanded.
 */
export const resolveNestedSelector = (
	options: Options,
): ResolvedSelector[] => {
	const { node } = options;

	const selector = (() => {
		if (options.selector) return options.selector;
		return node.type === 'rule'
			? (node as Rule).selector
			: (node as AtRule).params;
	})();

	const {
		_seen = new Set<string>(),
		initialNode = node,
		childSelector = selector,
	} = options._internal ?? {};

	const parent = node.parent as undefined | Root | ChildNode;
	if (!parent || parent.type === 'root') {
		return [{ raw: childSelector, resolved: selector, inject: null }];
	}

	const recurse = (
		recurseSelector: string,
		recurseNode: Node,
	) => {
		return resolveNestedSelector({
			selector: recurseSelector,
			node: recurseNode,
			_internal: { _seen, initialNode, childSelector: selector },
		});
	};

	// Prevent infinite recursion for complex selectors like
	// `.b:is(:hover, :focus) &`
	const key = getCacheKey(selector, node);
	if (selector.includes(',') && !_seen.has(key)) {
		_seen.add(key);
		return split(selector, ',', false)
			.map((selectorPart) => selectorPart.trim())
			.filter(Boolean)
			.flatMap((selectorPart, index) => {
				return recurse(selectorPart, node);
			});
	}

	if (parent.type !== 'rule' && !isAtRule(parent)) {
		return recurse(selector, parent);
	}

	// `@at-root (with[out]: X)` should not be processed
	if (
		isAtRule(parent) && parent.name === 'at-root'
		&& parent.params.match(/\(\s*with(?:out)?:/)
	) {
		return recurse(selector, parent);
	}

	const parentSelectors = isAtRule(parent)
		? split(parent.params, ',', false).map((x) => x.trim())
		: parent.selectors;

	return parentSelectors.reduce<ResolvedSelector[]>((acc, parentSelector) => {
		if (selector.includes('&')) {
			const newlyResolvedSelectors = recurse(parentSelector, parent)
				.map((resolvedParentSelector) => {
					return {
						raw: selector,
						resolved: split(selector, '&', true).join(resolvedParentSelector.resolved),
						inject: selector.includes('&') ? resolvedParentSelector.resolved : null,
					};
				});

			acc.push(...newlyResolvedSelectors);
			return acc;
		}

		const combinedSelector = isAtRootContext(node)
			? selector
			: [parentSelector, selector].join(' ');

		const nestedRecurse = recurse(combinedSelector, parent);
		if (node === initialNode) {
			nestedRecurse[0].raw = selector;
			if (!selector.includes('&')) {
				nestedRecurse[0].inject = null;
			}
		}
		acc.push(...nestedRecurse);
		return acc;
	}, []);
};
