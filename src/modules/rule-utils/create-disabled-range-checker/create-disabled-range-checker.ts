import type { Node } from 'postcss';
import type { PostcssResult } from 'stylelint';

/**
 * Creates a predicate for any overlap with global or rule-specific disabled lines.
 * Captures the current ranges for one rule run and respects `ignoreDisables`.
 * Nodes without source positions are checked at line zero.
 *
 * @param   stylelint   Disable metadata collected by Stylelint for the current result.
 * @param   ruleName    Fully qualified rule name, including the plugin namespace.
 *
 * @returns             Whether any source line of a node overlaps a disabled range.
 */
export const createDisabledRangeChecker = (
	stylelint: Pick<PostcssResult['stylelint'], 'disabledRanges' | 'config'>,
	ruleName: string,
) => {
	const { disabledRanges } = stylelint;
	const ranges = [...(disabledRanges.all ?? []), ...(disabledRanges[ruleName] ?? [])];

	return (node: Node): boolean => {
		if (stylelint.config?.ignoreDisables) return false;
		const start = node.source?.start?.line ?? 0;
		const end = node.source?.end?.line ?? start;
		return ranges.some((range) => range.start <= end && (range.end ?? Infinity) >= start);
	};
};
