import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import { isKeyframesRule } from '#modules/postcss/is-keyframes-rule/is-keyframes-rule';
import { isRule } from '#modules/postcss/is-rule/is-rule';
import type { AtRule, ChildNode, Rule } from 'postcss';

/**
 * Checks whether a PostCSS node owns a selector that can be resolved.
 *
 * @param   node   PostCSS child node to inspect.
 *
 * @returns        Whether the node is a rule, `@nest`, or `@at-root` selector owner.
 */
export const isSelectorOwnerNode = (node: ChildNode): node is AtRule | Rule => {
	if (isKeyframesRule(node)) return false;

	return isRule(node) || isAtRule(node, ['nest', 'at-root']);
};
