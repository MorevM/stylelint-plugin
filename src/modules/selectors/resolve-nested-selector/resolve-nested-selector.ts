import { assert, isEmpty, isNullish, tsObject } from '@morev/utils';
import { getRoot, getRuleDeclarations, isAtRule, isRule, resolveSassVariable } from '#modules/postcss';
import { split } from './utils';
import type { AtRule, ChildNode, Node, Root, Rule } from 'postcss';
import type {
	Options,
	PathItem,
	PendingSelectorReplacement,
	ResolvedPathItem,
	ResolvedSelector,
	ResolvedSelectorReplacement,
} from './resolve-nested-selector.types';

// The global form finds every selector occurrence, while the anchored form distinguishes
// a standalone parent reference in a variable value from a larger expression.
const SASS_NESTING_INTERPOLATION_REGEXP = /#{\s*&\s*}/g;
const SASS_NESTING_INTERPOLATION_VALUE_REGEXP = /^#{\s*&\s*}$/;

/**
 * Calculates exact resolved ranges for ordered selector replacements.
 *
 * @param   replacements   Replacements expressed in original selector coordinates.
 *
 * @returns                Replacements with corresponding resolved selector ranges.
 */
const resolveReplacementRanges = (
	replacements: PendingSelectorReplacement[],
): ResolvedSelectorReplacement[] => {
	let shift = 0;

	// Replacements are discovered in separate phases, so normalize them to source order
	// before carrying each length change forward to the following ranges. Sorting by the
	// end index also puts a zero-width parent injection before a replacement at index `0`.
	return replacements
		.toSorted((a, b) => {
			return a.sourceRange[0] - b.sourceRange[0]
				|| a.sourceRange[1] - b.sourceRange[1];
		})
		.map(({ type, sourceRange, resolvedValue }) => {
			const [sourceStart, sourceEnd] = sourceRange;
			const resolvedStart = sourceStart + shift;
			const resolvedEnd = resolvedStart + resolvedValue.length;

			// Replacing source text changes the coordinate space of every later replacement.
			shift += resolvedValue.length - (sourceEnd - sourceStart);

			return {
				type,
				sourceRange,
				resolvedRange: [resolvedStart, resolvedEnd],
			};
		});
};

/**
 * Finds raw nesting selectors using the same syntax-aware splitting rules as resolution.
 * A regexp or `indexOf()` would also count escaped ampersands and ampersands inside
 * attributes, quotes, or SASS interpolation, none of which are nesting selectors.
 *
 * @param   source   Original selector.
 *
 * @returns          Exact ranges of nesting selector characters.
 */
const getNestingSourceRanges = (source: string): Array<[number, number]> => {
	const parts = split(source, '&', true);
	let sourceIndex = 0;

	return parts.slice(0, -1).map((part) => {
		sourceIndex += part.length;
		const sourceRange: [number, number] = [sourceIndex, sourceIndex + 1];
		sourceIndex += 1;

		return sourceRange;
	});
};

/**
 * Maps an original selector boundary to its position after selector resolution.
 *
 * @param   selector      Resolved selector and its exact replacements.
 * @param   sourceIndex   Boundary in the original selector.
 *
 * @returns               Corresponding boundary in the resolved selector.
 */
const resolveSelectorSourceIndex = (
	selector: ResolvedSelector,
	sourceIndex: number,
) => {
	return selector.replacements.reduce((resolvedIndex, replacement) => {
		const [sourceStart, sourceEnd] = replacement.sourceRange;

		// Only replacements ending at or before a boundary can shift it.
		// Callers map AST node boundaries, which are expected to stay outside
		// the interior of a replaced span.
		if (sourceEnd > sourceIndex) return resolvedIndex;

		const [resolvedStart, resolvedEnd] = replacement.resolvedRange;
		return resolvedIndex + (resolvedEnd - resolvedStart) - (sourceEnd - sourceStart);
	}, sourceIndex);
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
		const replacementsKey = item.replacements
			.map(({ type, sourceRange, resolvedRange }) => {
				return `${type}:${sourceRange.join('-')}:${resolvedRange.join('-')}`;
			})
			.join(',');

		// Equal resolved selectors can still point to different source ranges.
		// Keep those mappings distinct so diagnostics are attached to the correct branch.
		const key = `${item.source}|${item.resolved}|${item.offset}|${substitutionsKey}|${replacementsKey}`;

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
		let {
			offset,
			value: source,
			resolvedValue,
			usedVariables,
			interpolationReplacements,
			node,
		} = tree.at(-1)!;
		assert(offset, '`getTrees` ensures that the last element includes `offset`');

		let context = '';
		// Variable interpolation has already changed `resolvedValue`, but its ranges are still
		// expressed in source coordinates. Resolve all ranges together after nesting is handled.
		const pendingReplacements: PendingSelectorReplacement[] =
			interpolationReplacements.map((replacement) => ({
				type: 'interpolation',
				...replacement,
			}));

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

		// `#{&}` depends on the fully accumulated parent context,
		// so it cannot be resolved during the earlier variable pass.
		// Search the source to retain exact ranges and spelling,
		// including whitespace variants such as `#{ & }`.
		const nestingInterpolationMatches = [
			...source.matchAll(SASS_NESTING_INTERPOLATION_REGEXP),
		];

		if (!isEmpty(nestingInterpolationMatches)) {
			for (const match of nestingInterpolationMatches) {
				pendingReplacements.push({
					type: 'interpolation',
					sourceRange: [match.index, match.index + match[0].length],
					resolvedValue: context,
				});
				usedVariables[match[0]] = context;
			}

			resolvedValue = resolvedValue.replaceAll(SASS_NESTING_INTERPOLATION_REGEXP, () => context);
		}

		let parent: string | null;
		let resolved: string;
		let substitutions: ResolvedSelector['substitutions'];

		if (source.includes('&')) {
			const nonContextParts = split(resolvedValue, '&', true);
			const nestingSourceRanges = getNestingSourceRanges(source);

			// If syntax-aware splitting finds no raw nesting token, `&` occurred only inside
			// an interpolation or another preserved construct. The resulting selector is still
			// a descendant, so its implicit parent is represented as a zero-width injection.
			if (nonContextParts.length === 1) {
				const inject = `${context} `;
				resolved = inject + nonContextParts.join(context);
				pendingReplacements.push({
					type: 'parent-injection',
					sourceRange: [0, 0],
					resolvedValue: inject,
				});
			} else {
				// Raw nesting tokens are replaced in place. Recording each source occurrence
				// lets downstream consumers map resolved nodes back without reconstructing shifts.
				resolved = nonContextParts.join(context);
				nestingSourceRanges.forEach((sourceRange) => {
					pendingReplacements.push({
						type: 'nesting',
						sourceRange,
						resolvedValue: context,
					});
				});
			}

			substitutions = { ...usedVariables };

			// Report `&` only when syntax-aware splitting found a real nesting token;
			// ampersands inside interpolation, attributes, or quotes are represented separately.
			if (!isEmpty(nestingSourceRanges)) {
				substitutions['&'] = context;
			}

			parent = context || null;
		} else {
			// If there is no `&`, treat the source selector as an additional descendant.
			const inject = context && !isAtRule(node, ['at-root'])
				? `${context} `
				: '';

			resolved = inject + resolvedValue;
			parent = inject || null;
			substitutions = isEmpty(usedVariables) ? null : usedVariables;

			if (inject) {
				// The implicit parent prefix has no characters in the source branch,
				// therefore its source range is the zero-width boundary before the selector.
				pendingReplacements.push({
					type: 'parent-injection',
					sourceRange: [0, 0],
					resolvedValue: inject,
				});
			}
		}

		const replacements = resolveReplacementRanges(pendingReplacements);

		// This invariant prevents a partially described transformation from silently
		// producing corrupt source-to-resolved mappings.
		const mappedResolvedLength = replacements.reduce((length, replacement) => {
			const [sourceStart, sourceEnd] = replacement.sourceRange;
			const [resolvedStart, resolvedEnd] = replacement.resolvedRange;

			return length + (resolvedEnd - resolvedStart) - (sourceEnd - sourceStart);
		}, source.length);

		assert(
			mappedResolvedLength === resolved.length,
			'Replacements must describe every selector length change',
		);

		return {
			source,
			resolved,
			parent,
			substitutions,
			replacements,
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
			// A standalone parent reference resolves to the whole current context.
			// Handle it before generic value parsing, which splits whitespace inside `#{ & }`.
			if (
				declaration.value === '&'
				|| SASS_NESTING_INTERPOLATION_VALUE_REGEXP.test(declaration.value)
			) {
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
const resolveNestedSelector = (options: Options): ResolvedSelector[] => {
	const trees = getTrees(options.node, options.source);
	// All branches have the same root, so we pick it once.
	const root = getRoot(trees[0][0].node);
	let nodeVariables: Record<string, string | null> = resolveNodeVariables(root);

	const resolvedTrees: ResolvedPathItem[][] = trees.map((pathItems) => {
		return pathItems.map((pathItem, index) => {
			const usedVariables: Record<string, string> = {};
			// Capture ranges at substitution time: after `resolvedValue` changes length,
			// searching it again could no longer recover original selector coordinates.
			const interpolationReplacements: ResolvedPathItem['interpolationReplacements'] = [];

			const currentItem = pathItems[index];
			const prevItems = pathItems.slice(0, index + 1);
			const context = prevItems.map((item) => item.value).join(' ');

			nodeVariables = {
				...nodeVariables,
				...resolveNodeVariables(currentItem.node, context),
			};

			const resolvedValue = pathItem.value.replaceAll(
				/#{([^}]+)}/g,
				(fullMatch, variableName: string, sourceIndex: number) => {
					// SASS ignores surrounding whitespace in a simple interpolation expression.
					// Normalize lookup while preserving `fullMatch` for exact source metadata.
					const variableValue = nodeVariables[variableName.trim()];
					if (!isNullish(variableValue)) {
						usedVariables[fullMatch] = variableValue;
						interpolationReplacements.push({
							sourceRange: [sourceIndex, sourceIndex + fullMatch.length],
							resolvedValue: variableValue,
						});
					}
					return variableValue ?? fullMatch;
				},
			);

			return {
				...pathItem,
				usedVariables,
				interpolationReplacements,
				resolvedValue,
			};
		});
	});

	return resolveSelectorTrees(resolvedTrees);
};

export { resolveNestedSelector, resolveSelectorSourceIndex };
