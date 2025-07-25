import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import type { ChildNode } from 'postcss';

export const isKeyframesRule = (rule: ChildNode) => {
	return isAtRule(rule.parent, ['keyframes']);
};
