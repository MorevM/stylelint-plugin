import { isUndefined } from '@morev/utils';
import { normalizeLocalSelector } from '../normalize-local-selector/normalize-local-selector';
import type { SelectorSetMatcher } from '../../order.types';

/**
 * Matches an unordered collection of distinct complete local selector branches.
 *
 * @param   matcher     Exact or inclusive set requirement.
 * @param   selectors   Normalized distinct branches belonging to one family.
 *
 * @returns             Whether every required branch and the optional size match.
 */
export const matchesSelectorSet = (matcher: SelectorSetMatcher['selectorSet'], selectors: readonly string[]) => {
	const required = (matcher.equals ?? matcher.includes).map((value) => normalizeLocalSelector(value)!);
	const size = matcher.equals ? required.length : matcher.size;
	return (isUndefined(size) || size === selectors.length) && required.every((value) => selectors.includes(value));
};
