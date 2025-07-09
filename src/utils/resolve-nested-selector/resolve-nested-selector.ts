import { split } from './utils';
import type { AtRule, ChildNode, Node, Root, Rule } from 'postcss';
import type { AmpersandValues, Options } from './resolve-nested-selector.types';

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
 * Recursively resolves a nested selector to its fully expanded form.
 *
 * @param   options   Resolver options.
 *
 * @returns           An array of fully resolved selector strings with all nesting and `&` references expanded.
 */
export const resolveNestedSelector = (
	options: Options,
): string[] & AmpersandValues => {
	const ampersandValues: string[] = [];
	const withAmpersandValues = (selectors: string[]) => {
		selectors.forEach((selector) => Object.assign(selector, { ampersandValues }));
		return Object.assign(selectors, { ampersandValues });
	};

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
	} = options._internal ?? {};

	const parent = node.parent as undefined | Root | ChildNode;
	if (!parent || parent.type === 'root') return withAmpersandValues([selector]);

	const recurse = (
		recurseSelector: string,
		recurseNode: Node,
	) => {
		return resolveNestedSelector({
			selector: recurseSelector,
			node: recurseNode,
			_internal: { _seen, initialNode },
		});
	};

	// Prevent infinite recursion for complex selectors like
	// `.b:is(:hover, :focus) &`
	const key = selector + node.source?.start?.column + node.source?.end?.column;
	if (selector.includes(',') && !_seen.has(key)) {
		_seen.add(key);
		return withAmpersandValues(
			split(selector, ',', false)
				.map((selectorPart) => selectorPart.trim())
				.filter(Boolean)
				.flatMap((selectorPart, index) => {
					const result = recurse(selectorPart, node);
					index === 0 && ampersandValues.push(...result.ampersandValues);
					return result;
				}),
		);
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

	return withAmpersandValues(
		parentSelectors.reduce<string[]>((acc, parentSelector) => {
			if (selector.includes('&')) {
				const newlyResolvedSelectors = recurse(parentSelector, parent)
					.map((resolvedParentSelector) => {
						initialNode === node && ampersandValues.push(resolvedParentSelector);
						return split(selector, '&', true).join(resolvedParentSelector);
					});

				acc.push(...newlyResolvedSelectors);
				return acc;
			}

			const combinedSelector = isAtRootContext(node)
				? selector
				: [parentSelector, selector].join(' ');

			acc.push(...recurse(combinedSelector, parent));
			return acc;
		}, []),
	);
};
