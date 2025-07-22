import { parseSelectors } from '#utils';

/**
 * Thin wrapper around `parseSelectors` for the common case of a single (non-comma-separated) selector.
 *
 * Assumes the input is a single selector without commas (e.g., `.block__element--modifier`),
 * and returns the first parsed `Selector` node.
 *
 * @param   selector   A simple, single CSS selector string.
 *
 * @returns            The first (and only) parsed selector node.
 */
export const parseSelector = (selector: string) =>
	parseSelectors(selector)[0];
