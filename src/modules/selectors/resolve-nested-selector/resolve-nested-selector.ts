import { assert } from '@morev/utils';
import { isAtRule, isRule } from '#modules/postcss';
import { split } from './utils';
import type { AtRule, Node, Rule } from 'postcss';
import type { Options, PathItem, ResolvedSelector } from './resolve-nested-selector.types';

/**
 * Converts `#{&}` Sass interpolations to plain `&` in a selector string.
 *
 * This is useful for normalizing selectors before further resolution,
 * since `#{&}` behaves identically to `&` in Sass nesting but is not recognized
 * by standard selector parsers as a nesting reference.
 *
 * @param   selector   The selector to process.
 *
 * @returns            The selector with `#{&}` interpolations replaced by `&`.
 */
const unwrapInterpolatedNesting = (selector: string) => {
	return selector.replaceAll('#{&}', '&');
};

/**
 * Calculates the character offset of a specific selector part within
 * a comma-separated selector string.
 *
 * This is useful for mapping resolved selectors back to their original
 * location within a multi-selector source (e.g., for diagnostics or error reporting).
 *
 * @param   selectorParts   The list of selectors split by commas.
 * @param   index           The index of the current selector part.
 *
 * @returns                 The character offset of the selector part in the original selector string.
 */
const getOffset = (selectorParts: string[], index: number) => {
	if (selectorParts.length === 1) return 0;
	if (index === 0) return 0;

	const prevPartsLength = selectorParts.slice(0, index)
		.reduce((acc, selector) => acc + selector.length, 0);

	// Account for leading spaces that will be stripped during parsing.
	const currentPartLeadingSpacesLength = selectorParts[index]
		.match(/^(\s+)/)?.[1].length ?? 0;

	// `+ index` to consider stripped commas offset.
	return prevPartsLength + currentPartLeadingSpacesLength + index;
};

/**
 * Builds a tree of nesting contexts (rules and at-rules) for a given PostCSS node.
 *
 * Each returned path represents a chain of `rule`, `@nest`, or `@at-root` constructs
 * that apply to the node. \
 * This is useful for resolving the fully qualified selector,
 * including all intermediate nesting constructs.
 *
 * @param   node           The PostCSS rule or at-rule whose nesting tree is being built.
 * @param   nodeSelector   Optional selector string to override the node's own selector.
 *
 * @returns                An array of `PathItem[]`, where each inner array represents a complete
 *                         nesting path from a base selector up to the root.
 */
const getTrees = (
	node: Rule | AtRule,
	nodeSelector?: string,
): PathItem[][] => {
	const results: PathItem[][] = [];

	const walk = (current: Node, path: PathItem[]) => {
		const { parent } = current;

		if (!parent || parent.type === 'root') {
			results.push(path);
			return;
		}

		if (isRule(parent)) {
			for (const selector of parent.selectors) {
				walk(parent, [{ type: 'rule', value: selector }, ...path]);
			}
			return;
		}

		if (isAtRule(parent, ['nest', 'at-root'])) {
			// Skip `@at-root (with[out]: media)` declarations -
			// they don't impact the tree structure.
			if (parent.name === 'at-root' && parent.params.match(/\(\s*with(?:out)?:/)) {
				return walk(parent, path);
			}

			const parts = split(parent.params, ',', false)
				.map((s) => s.trim());

			const type = parent.name === 'nest' ? 'nest' : 'at-root';

			for (const part of parts) {
				// If `@at-root` doesn't contain `&`, further resolution is pointless,
				// as following selectors won't affect the result.
				if (type === 'at-root' && !part.includes('&')) {
					results.push([{ type: 'at-root', value: part }, ...path]);
					return;
				}
				// Continue walking up the tree with meaningful `@nest` or `@at-root` value.
				walk(parent, [{ type, value: part }, ...path]);
			}
			return;
		}

		// Process other `AtRule`s except `nest` and `at-root`.
		walk(parent, path);
	};

	nodeSelector ??= isAtRule(node) ? node.params : node.selector;
	const initialSelectors = split(nodeSelector, ',', false);

	for (let i = 0, l = initialSelectors.length; i < l; i++) {
		const selector = initialSelectors[i];
		const offset = getOffset(initialSelectors, i);

		const current = { offset, type: 'rule', value: selector.trim() } as const;
		// If `at-root` does not contain `&` character,
		// further traversal will result in an incorrect `inject`.
		if (isAtRule(node, ['at-root']) && !selector.includes('&')) {
			results.push([current]);
		} else {
			walk(node, [current]);
		}
	}

	return results;
};

/**
 * Converts a list of selector trees (paths of nesting) into resolved selectors.
 *
 * @param   trees   An array of nesting paths.
 *
 * @returns         An array of `ResolvedSelector` objects.
 */
const resolveSelectorTrees = (trees: PathItem[][]): ResolvedSelector[] => {
	return trees.map((tree) => {
		const { offset, value: source } = tree.at(-1)!;
		assert(offset, '`getTrees` ensures that the last element includes `offset`');

		let context = '';

		// Traverse all nodes except the last one (which holds the source selector).
		for (let i = 0, l = tree.length; i < l; i++) {
			const item = tree[i];
			const isLast = i === tree.length - 1;

			if (isLast) continue;

			// If the value contains `&`, replace it with the current context.
			// Otherwise, concatenate the value as a descendant selector.
			context = item.value.includes('&')
				? split(item.value, '&', true).join(context).trim()
				: context.length ? `${context} ${item.value}` : item.value;
		}

		if (source.includes('&')) {
			// If the source selector contains `&`, replace it with the accumulated context.
			const resolved = split(unwrapInterpolatedNesting(source), '&', true)
				.join(context);

			return { source, resolved, inject: context, offset };
		}

		// If there is no `&`, treat the source selector as an additional descendant.
		const inject = context ? `${context} ` : '';
		return { source, resolved: inject + source, inject, offset };
	});
};

/**
 * Recursively resolves a nested selector to its fully expanded form
 * by analyzing its ancestry and applying all nesting contexts.
 *
 * Supports resolving selectors from:
 * * Rules inside other rules
 * * `@nest` at-rules
 * * `@at-root` at-rules (including their context-resetting behavior)
 *
 * @param   options   Object containing the PostCSS node and optionally an override selector string.
 *
 * @returns           An array of `ResolvedSelector` objects, where each represents a complete flattened selector.
 */
export const resolveNestedSelector = (options: Options): ResolvedSelector[] => {
	const trees = getTrees(options.node, options.source);

	return resolveSelectorTrees(trees);
};
