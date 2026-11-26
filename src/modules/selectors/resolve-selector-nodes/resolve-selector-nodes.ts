import { isEmpty } from '@morev/utils';
import { getRuleContentMeta } from '#modules/postcss/get-rule-content-meta/get-rule-content-meta';
import { parseSelectors } from '#modules/selectors/parse-selectors/parse-selectors';
import { resolveNestedSelector } from '#modules/selectors/resolve-nested-selector/resolve-nested-selector';
import { extractSourceNodeMeta, linkSourceMeta } from './utils';
import type { MappedSelector, Options } from './resolve-selector-nodes.types';

/**
 * Additional selector trees a rule can inspect alongside the mapped nodes.
 */
type SelectorTree = 'source' | 'lexicalParent' | 'parent';

/**
 * Resolves SCSS/CSS nested selectors and links resolved selector nodes
 * back to their corresponding source nodes, preserving positional metadata.
 *
 * @param   options   Object containing the PostCSS rule node and resolution context.
 * @param   trees     Additional trees to return. Omitting this argument returns all three.
 *
 * @returns           Array of mapped selectors with enriched source and resolved nodes.
 */
export function resolveSelectorNodes<Tree extends SelectorTree>(
	options: Options, trees: readonly Tree[],
): Array<Pick<MappedSelector, 'resolved' | 'replacements' | Tree>>;
export function resolveSelectorNodes(options: Options): MappedSelector[];
export function resolveSelectorNodes(options: Options, trees?: readonly SelectorTree[]) {
	const contentOffset = getRuleContentMeta(options.node).offset;
	const includeSource = trees?.includes('source') ?? true;
	const includeLexicalParent = trees?.includes('lexicalParent') ?? true;
	const includeParent = trees?.includes('parent') ?? true;

	return resolveNestedSelector(options).flatMap((selector) => {
		// `resolveNestedSelector` splits selectors by `,` internally,
		// so it's safe to take the first one directly.
		const resolvedSelectorNodes = parseSelectors(selector.resolved)[0];
		const sourceSelectorNodes = !includeSource && selector.source === selector.resolved
			? resolvedSelectorNodes
			: parseSelectors(selector.source)[0];

		// Filter out incomplete/invalid input.
		if (isEmpty(sourceSelectorNodes) || isEmpty(resolvedSelectorNodes)) {
			return [];
		}

		const offset = contentOffset + selector.offset;
		const sourceNodeMeta = extractSourceNodeMeta(sourceSelectorNodes, selector);

		const resolvedNodes = resolvedSelectorNodes
			.map((node) => linkSourceMeta(node, sourceNodeMeta, offset));

		const branch: Pick<MappedSelector, 'resolved' | 'replacements'> & Partial<MappedSelector> = {
			resolved: resolvedNodes,
			replacements: selector.replacements,
		};
		if (includeSource) branch.source = sourceSelectorNodes;
		if (includeLexicalParent) {
			branch.lexicalParent = selector.lexicalParent ? parseSelectors(selector.lexicalParent)[0] : null;
		}
		if (includeParent) branch.parent = selector.parent ? parseSelectors(selector.parent)[0] : null;
		return branch;
	});
}
