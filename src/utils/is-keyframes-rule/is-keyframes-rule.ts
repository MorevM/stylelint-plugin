import type { AtRule, ChildNode } from 'postcss';

export const isKeyframesRule = (rule: ChildNode) => {
	return rule.parent?.type === 'atrule'
		&& (rule.parent as AtRule).name === 'keyframes';
};
