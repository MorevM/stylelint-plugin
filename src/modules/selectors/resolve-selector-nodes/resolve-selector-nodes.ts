import { getRuleContentMeta } from '#modules/postcss/get-rule-content-meta/get-rule-content-meta';
import { parseSelectors } from '#modules/selectors/parse-selectors/parse-selectors';
import { resolveNestedSelector } from '#modules/selectors/resolve-nested-selector/resolve-nested-selector';
import { adjustSource, extractSourceNodeMeta, linkSourceMeta } from './utils';
import type { MappedSelector, Options } from './resolve-selector-nodes.types';

/**
 * Resolves SCSS/CSS nested selectors and links resolved selector nodes
 * back to their corresponding source nodes, preserving positional metadata.
 *
 * @param   options   Object containing the PostCSS rule node and resolution context.
 *
 * @returns           Array of mapped selectors with enriched source and resolved nodes.
 */
export const resolveSelectorNodes = (options: Options) => {
	const contextOffset = getRuleContentMeta(options.node).offset;

	return resolveNestedSelector(options).map<MappedSelector>((selector) => {
		// `resolveNestedSelector` splits selectors by `,` internally,
		// so it's safe to take the first one directly.
		const sourceSelectorNodes = parseSelectors(selector.source)[0];
		const resolvedSelectorNodes = parseSelectors(selector.resolved)[0];

		const sourceOffset = selector.offset;

		const sourceNodes = adjustSource(sourceSelectorNodes, selector, contextOffset);
		const sourceNodeMeta = extractSourceNodeMeta(sourceNodes, selector.inject);

		const resolvedNodes = resolvedSelectorNodes
			.map((node) => linkSourceMeta(node, sourceNodeMeta, sourceOffset, contextOffset));

		return {
			resolved: resolvedNodes,
			source: sourceNodes,
		};
	});
};
