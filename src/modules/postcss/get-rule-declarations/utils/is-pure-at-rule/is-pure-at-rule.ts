import { isEmpty } from '@morev/utils';
import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import { isRule } from '#modules/postcss/is-rule/is-rule';
import type { AtRule, ChildNode } from 'postcss';

/**
 * Determines whether the given at-rule is **pure**, meaning it does not
 * contain any style rules (`Rule` nodes) directly or nested within other
 * non-empty at-rules.
 *
 * In other words, a pure at-rule can contain only other empty at-rules or no
 * children at all.
 *
 * @param   rule   The PostCSS at-rule node to check.
 *
 * @returns        `true` if the at-rule is pure, otherwise `false`.
 */
export const isPureAtRule = (rule: AtRule) => {
	const stack: ChildNode[] = [...(rule.nodes ?? [])];

	while (stack.length) {
		const current = stack.pop()!;
		if (isRule(current)) return false;
		if (isAtRule(current) && !isEmpty(current.nodes)) {
			stack.push(...current.nodes);
		}
	}

	return true;
};
