import { isEmpty } from '@morev/utils';
import { selectorNodesToString } from '#modules/selectors';
import type postcss from 'postcss';
import type { ResolvedNode } from '#modules/selectors';

/**
 * Represents a single recorded violation.
 */
type Violation = {
	/**
	 * Selector string identified as a side effect.
	 */
	selector: string;

	/**
	 * The PostCSS AST node associated with the violation.
	 */
	node: postcss.Node;

	/**
	 * Start index of the violation in the source.
	 */
	index: number;

	/**
	 * End index of the violation in the source.
	 */
	endIndex: number;
};

/**
 * Creates a new registry for tracking violations within a single lint run.
 *
 * The registry:
 * - Keeps a list of recorded violations with their selector, node, and source indices.
 * - Skips adding a violation if any ancestor node already reported the same selector.
 * - Skips adding a violation if the selector matches any of the provided ignore patterns.
 * - Calculates `index` and `endIndex` based on the original source ranges of resolved nodes.
 *
 * @param   ignorePatterns   Array of regular expressions for selectors to ignore.
 *
 * @returns                  An object with:
 *                           - `getViolations`: Returns all recorded violations.
 *                           - `addViolation`: Attempts to add a violation for the given node/selector.
 */
export const createViolationsRegistry = (ignorePatterns: RegExp[]) => {
	const violations: Violation[] = [];
	const seenBySelector = new Map<string, WeakSet<postcss.Node>>();

	/**
	 * Checks whether any ancestor of the given node has already reported the same selector.
	 *
	 * @param   node       Node to check ancestors for.
	 * @param   selector   Selector text to match against recorded violations.
	 *
	 * @returns            True if an ancestor has a recorded violation for this selector.
	 */
	const hasAncestorWithSameSelector = (node: postcss.Node, selector: string) => {
		const seen = seenBySelector.get(selector);
		if (!seen) return false;

		for (let { parent } = node; parent; parent = parent.parent) {
			if (seen.has(parent)) return true;
		}
		return false;
	};

	/**
	 * Attempts to add a new violation to the registry.
	 * Skips if the selector is ignored or already reported in an ancestor node.
	 *
	 * @param   node    PostCSS AST node where the violation occurred.
	 * @param   nodes   Resolved selector nodes used to compute selector text and source ranges.
	 */
	const addViolation = (node: postcss.Node, nodes: ResolvedNode[]) => {
		const selector = selectorNodesToString(nodes);
		// TODO: Skip interpolated selectors for now
		if (selector.includes('#{')) return;

		if (ignorePatterns.some((pattern) => pattern.test(selector))) return;
		// Skip if any ancestor node has already reported this selector -
		// prevents duplicate violations from nested contexts.
		if (hasAncestorWithSameSelector(node, selector)) return;

		const sourcePresentedNodes = nodes
			.filter((resolvedNode) => !isEmpty(resolvedNode.meta.sourceMatches));
		if (isEmpty(sourcePresentedNodes)) return;

		const [firstMatch, lastMatch] = [
			sourcePresentedNodes[0].meta.sourceMatches.at(-1)!,
			sourcePresentedNodes.at(-1)!.meta.sourceMatches[0],
		];
		const offset = firstMatch.contextOffset + firstMatch.sourceOffset;

		const index = firstMatch.sourceRange[0] + offset;
		const endIndex = lastMatch.sourceRange[1] + offset;

		violations.push({ node, index, endIndex, selector });

		let seen = seenBySelector.get(selector);
		if (!seen) {
			seen = new WeakSet();
			seenBySelector.set(selector, seen);
		}
		seen.add(node);
	};

	/**
	 * Returns the list of all recorded violations.
	 *
	 * @returns   Array of violations with selector text, AST node, and source indices.
	 */
	const getViolations = () => violations;

	return { getViolations, addViolation };
};
