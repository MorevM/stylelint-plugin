import { isEmpty } from '@morev/utils';
import type parser from 'postcss-selector-parser';

/**
 * Creates a buffer to accumulate nodes between combinators.
 * On flush, it returns current buffer if it has at least one `.class`.
 * If no class node is found, returns `null`.
 *
 * @returns
 *    An object with:
 *    * `push(node)`: adds a node to the current buffer;
 *    * `flush()`: returns the full buffer if it contains a `.class`, or `null` otherwise (also clears the buffer).
 */
const createCandidateStore = () => {
	let buffer: parser.Node[] = [];

	const push = (node: parser.Node) => { buffer.push(node); };

	const flush = (): parser.Node[] | null => {
		const classIndex = buffer.findIndex((node) => node.type === 'class');
		if (classIndex === -1) {
			buffer = [];
			return null;
		}

		const segment = [...buffer];
		buffer = [];
		return segment;
	};

	return { push, flush };
};

/**
 * Splits a flat selector node list into segments that are potential BEM candidates.
 *
 * A segment is:
 * - any node sequence between combinators that includes at least one class;
 * - a nesting selector followed by tag/class/attribute/id/pseudo nodes.
 *
 * Example: \
 * `.block.block--active section h3.section-title` \
 * `[ ['.block', '.block--active'], ['h3', '.section-title'] ]`
 *
 * @param   nodes   A flat list of parsed selector nodes from `postcss-selector-parser`.
 *
 * @returns         Array of Node arrays, each representing
 *                  a potentially BEM-relevant segment, sorted by source order.
 */
export const getBemCandidateSegments = (nodes: parser.Node[]): parser.Node[][] => {
	if (isEmpty(nodes)) return [];

	const result: parser.Node[][] = [];
	let i = 0;

	// Stores candidates between combinators until flush is needed
	const candidates = createCandidateStore();

	while (i < nodes.length) {
		const node = nodes[i];

		// Flush accumulated segment when
		// combinator (space, >, +, etc) is reached.
		if (node.type === 'combinator') {
			const flushed = candidates.flush();
			flushed && result.push(flushed);
			i++;
			continue;
		}

		// Handle nesting selector (`&`) and gather related compound nodes
		if (node.type === 'nesting' || (node.type === 'tag' && node.value === '#{&}')) {
			const segment: parser.Node[] = [node];
			i++;

			// Collect immediately following compound nodes
			// (e.g. `__element`, `::after`)
			while (i < nodes.length) {
				const next = nodes[i];
				if (next.type === 'combinator') break;

				// Include common compound types - class selectors can appear in any position,
				// e.g. `div[data]#id.class` is valid, and additional nodes may be useful
				// for more precise rule validation
				if (['tag', 'class', 'pseudo', 'attribute', 'id', 'nesting'].includes(next.type)) {
					segment.push(next);
				}

				// Recursively extract from nested pseudo-selectors like `:has(.foo)`
				if ((next.type === 'pseudo' || next.type === 'selector') && !isEmpty(next.nodes)) {
					/* eslint-disable max-depth -- No way */
					for (const subSelector of next.nodes) {
						if ('nodes' in subSelector) {
							const innerSegments = getBemCandidateSegments(subSelector.nodes);
							result.push(...innerSegments);
						}
					}
					/* eslint-enable max-depth */
				}

				i++;
			}

			if (segment.length > 0) {
				result.push(segment);
			}

			continue;
		}

		// Recursively extract segments from pseudo-selectors.
		// Functional pseudo-classes like `:is(.the-component)`
		// are valid and may contain BEM-meaningful parts.
		if (node.type === 'pseudo' && 'nodes' in node && Array.isArray(node.nodes)) {
			for (const subSelector of node.nodes) {
				const innerSegments = getBemCandidateSegments(subSelector.nodes);
				result.push(...innerSegments);
			}
		}

		// Accumulate regular node as part of the current segment
		candidates.push(node);
		i++;
	}

	// Final flush after loop to catch trailing segment
	const remainingNodes = candidates.flush();
	remainingNodes && result.push(remainingNodes);

	// Sort segments by their original position in the selector.
	// Without this, nested selectors (e.g. inside `:not(...)`) may appear
	// before the main context, which breaks the expected document order.
	return result.sort((a, b) => a[0].sourceIndex < b[0].sourceIndex ? -1 : 1);
};
