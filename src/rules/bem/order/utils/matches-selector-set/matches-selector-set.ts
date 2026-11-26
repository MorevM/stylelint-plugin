import { normalizeLocalSelector } from '../normalize-local-selector/normalize-local-selector';
import type { SelectorSetMatcher } from '../../order.types';

/**
 * Normalizes a selector-set requirement for matching and comparing rule matchers.
 *
 * @param   matcher   Branch and count constraints from the configuration.
 *
 * @returns           Required branches and the effective inclusive bounds.
 */
export const prepareSelectorSet = (matcher: SelectorSetMatcher['selectorSet']) => {
	const branches = (matcher.equals ?? matcher.includes ?? []).map((value) => normalizeLocalSelector(value)!);
	const size = matcher.equals?.length ?? matcher.size;
	return {
		branches,
		minSize: size ?? Math.max(matcher.minSize ?? 1, branches.length),
		maxSize: size ?? matcher.maxSize ?? Infinity,
	};
};

/**
 * Tests whether the supplied branches and their possible counts satisfy a prepared set.
 *
 * @param   required   Prepared constraints.
 * @param   branches   Known distinct local branches.
 * @param   minSize    Smallest possible number of branches.
 * @param   maxSize    Largest possible number of branches. For a rule, both counts are equal.
 *
 * @returns            Whether the supplied set satisfies the constraints.
 */
export const hasRequiredBranches = (
	required: ReturnType<typeof prepareSelectorSet>, branches: readonly string[], minSize: number, maxSize = minSize,
) => required.minSize <= minSize && maxSize <= required.maxSize
	&& required.branches.every((branch) => branches.includes(branch));

/**
 * Matches a rule's complete local branches against an exact or inclusive set.
 *
 * @param   matcher     Authored or prepared selector-set requirement.
 * @param   selectors   Normalized distinct branches belonging to one family.
 *
 * @returns             Whether the rule satisfies the set requirement.
 */
export const matchesSelectorSet = (
	matcher: SelectorSetMatcher['selectorSet'] | ReturnType<typeof prepareSelectorSet>, selectors: readonly string[],
) => {
	const required = 'branches' in matcher ? matcher : prepareSelectorSet(matcher);
	return hasRequiredBranches(required, selectors, selectors.length);
};
