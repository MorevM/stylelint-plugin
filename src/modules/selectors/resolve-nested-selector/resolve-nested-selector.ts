import { assert, isEmpty, isNullish, tsObject } from '@morev/utils';
import { getRoot, getRuleDeclarations, isAtRule, isRule, resolveSassVariable } from '#modules/postcss';
import { split } from './utils';
import type { AtRule, ChildNode, Node, Root, Rule } from 'postcss';
import type { Options, PathItem, ResolvedPathItem, ResolvedSelector } from './resolve-nested-selector.types';

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
				walk(parent, [{ type: 'rule', value: selector, node: parent }, ...path]);
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
				walk(parent, [{ type, value: part, node: parent }, ...path]);
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

		const current = { offset, type: 'rule', value: selector.trim(), node } as const;
		walk(node, [current]);
	}

	return results;
};

/**
 * Filters out exact duplicates among resolved selectors.
 *
 * Why duplicates happen:
 * During path expansion we should traverse through all ancestors up to the Root
 * to collect SASS variables that could be referenced below.
 *
 * Constructs like `@at-root` hoist rules out of their current ancestry
 * (cutting everything above). When combined with list selectors (`,`), this can yield
 * multiple logical paths that resolve to the same final selector.
 *
 * @example
 * // Consider:
 * ```scss
 * .foo { .bar &, & .baz  { \@at-root { .bar {}  } } }
 * ```
 *
 * Formal path expansion (because of the list selector) produces two paths:
 * 1) `.foo .bar .foo .bar`
 * 2) `.foo .baz .bar`
 *
 * But `@at-root` cuts the ancestry, so both effectively resolve to `.bar`. \
 * `uniqueItems()` collapses them into a single result.
 *
 * @param   items   A list of resolved selector records to deduplicate.
 *
 * @returns         A new array with exact duplicates removed.
 */
const uniqueTrees = (items: ResolvedSelector[]): ResolvedSelector[] => {
	const seen = new Set<string>();

	return items.filter((item) => {
		const substitutionsKey = item.substitutions
			? tsObject.entries(item.substitutions)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, value]) => `${key}:${value ?? 'null'}`)
				.join(',')
			: 'null';

		const key = `${item.source}|${item.resolved}|${item.offset}|${substitutionsKey}`;

		if (seen.has(key)) return false;

		seen.add(key);
		return true;
	});
};

/**
 * Converts a list of selector trees (paths of nesting) into resolved selectors.
 *
 * @param   trees   An array of nesting paths.
 *
 * @returns         An array of `ResolvedSelector` objects.
 */
const resolveSelectorTrees = (trees: ResolvedPathItem[][]): ResolvedSelector[] => {
	const resolvedTrees = trees.map((tree) => {
		let { offset, value: source, resolvedValue, usedVariables, node } = tree.at(-1)!;
		assert(offset, '`getTrees` ensures that the last element includes `offset`');

		let context = '';

		// Traverse all nodes except the last one (which holds the source selector).
		for (let i = 0, l = tree.length; i < l; i++) {
			const item = tree[i];
			const isLast = i === tree.length - 1;
			const remainingItems = tree.slice(i);

			if (isLast) continue;

			// If the value contains `&`, replace it with the current context...
			if (item.value.includes('&')) {
				context = split(item.value, '&', true).join(context).trim();
			// ...at-root needs to be processed separately
			} else if (isAtRule(item.node, ['at-root'])) {
				// `@at-root` with an explicit parameter without `&`: start from it directly.
				// Example: `@at-root .bar { ... }`
				if (item.value) {
					context = item.value;
				// Bare `@at-root` (no parameter).
				// If any of the next path items relies on `&`, we cannot drop the context yet
				} else {
					const hasNestDescendants = remainingItems
						.some((item_) => item_.value.includes('&'));

					context = hasNestDescendants ? context : '';
				}
			// ...for `Rule`s without `&` concatenate the value as a descendant selector.
			} else {
				context = context.length ? `${context} ${item.value}` : item.value;
			}
		}

		if (resolvedValue.includes('#{&}')) {
			resolvedValue = resolvedValue.replaceAll('#{&}', context);
			usedVariables['#{&}'] = context;
		}

		if (source.includes('&')) {
			const nonContextParts = split(resolvedValue, '&', true);

			// If the resolved selector contains `&`,
			// replace it with the accumulated context.
			const resolved = nonContextParts.length === 1
				? `${context} ${nonContextParts.join(context)}`
				: nonContextParts.join(context);

			const substitutions = { ...usedVariables };

			// Raw amp, `&`
			if (/(?<!#\{)&/.test(source)) {
				substitutions['&'] = context;
			}

			return {
				source,
				resolved,
				parent: context || null,
				substitutions,
				offset,
			};
		}

		// If there is no `&`, treat the source selector as an additional descendant.
		const inject = context && !isAtRule(node, ['at-root'])
			? `${context} `
			: '';

		return {
			source,
			resolved: inject + resolvedValue,
			parent: inject || null,
			substitutions: isEmpty(usedVariables) ? null : usedVariables,
			offset,
		};
	});

	return uniqueTrees(resolvedTrees);
};

/**
 * Resolves all SASS variables defined directly inside a given PostCSS node.
 *
 * Special handling is applied for variables that reference the current selector
 * (e.g. `&`, `#{&}`), which are substituted with the provided `context` if available.
 *
 * @example
 * ```scss
 * .block {
 *   $b: #{&};
 *   $link: '#{$b}__link';
 * }
 * ```
 *
 * ```ts
 * resolveNodeVariables(rule, '.block');
 * // => { $b: '.block', $link: '.block__link' }
 * ```
 *
 * @param   node      A PostCSS node (e.g. `Rule`, `AtRule`, or `Root`) to collect variables from.
 * @param   context   A string to substitute in place of the parent selector `&` or `#{&}`.
 *                    If not provided, such variables will resolve to `null`.
 *
 * @returns           A record of resolved variable names to their values,
 *                    or `null` if resolution was not possible.
 */
const resolveNodeVariables = (
	node: ChildNode | Root | null,
	context?: string,
): Record<string, string | null> => {
	if (!node) return {};

	const variables: Record<string, string | null> = {};

	if (node && 'nodes' in node) {
		const nodeVariables = getRuleDeclarations(node, { mode: 'direct' })
			.filter((declaration) => !!declaration.prop.match(/^\$[\w-]+$/));

		nodeVariables.forEach((declaration) => {
			if (['&', '#{&}'].includes(declaration.value)) {
				variables[declaration.prop] = context ?? null;
			} else {
				if (declaration.value.includes('&') && context) {
					variables['&'] = context;
				}

				variables[declaration.prop] = resolveSassVariable(declaration.value, variables);
			}
		});
	}

	return variables;
};

/**
 * Recursively resolves a nested selector to its fully expanded form
 * by analyzing its ancestry and applying all nesting contexts and SASS variables.
 *
 * Supports resolving selectors from:
 * - Rules inside other rules
 * - `@nest` at-rules
 * - `@at-root` at-rules (including their context-resetting behavior)
 * - Selectors with SASS variables that can be statically determined
 *
 * @param   options   Object containing the PostCSS node and optionally an override selector string.
 *
 * @returns           An array of `ResolvedSelector` objects, where each represents a complete flattened selector.
 */
export const resolveNestedSelector = (options: Options): ResolvedSelector[] => {
	const trees = getTrees(options.node, options.source);
	// All branches have the same root, so we pick it once.
	const root = getRoot(trees[0][0].node);
	let nodeVariables: Record<string, string | null> = resolveNodeVariables(root);

	const resolvedTrees: ResolvedPathItem[][] = trees.map((pathItems) => {
		return pathItems.map((pathItem, index) => {
			const usedVariables: Record<string, string> = {};

			const currentItem = pathItems[index];
			const prevItems = pathItems.slice(0, index + 1);
			const context = prevItems.map((item) => item.value).join(' ');

			nodeVariables = {
				...nodeVariables,
				...resolveNodeVariables(currentItem.node, context),
			};

			const resolvedValue = pathItem.value.replaceAll(
				/#{([^}]+)}/g,
				(fullMatch, variableName: string) => {
					const variableValue = nodeVariables[variableName];
					if (!isNullish(variableValue)) {
						usedVariables[`#{${variableName}}`] = variableValue;
					}
					return variableValue ?? fullMatch;
				},
			);

			return {
				...pathItem,
				usedVariables,
				resolvedValue,
			};
		});
	});

	return resolveSelectorTrees(resolvedTrees);
};
