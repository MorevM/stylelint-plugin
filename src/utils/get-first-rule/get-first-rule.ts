import { isKeyframesRule } from '../is-keyframes-rule/is-keyframes-rule';
import type { Root, Rule } from 'postcss';

/**
 * Retrieves the first `Rule` from the PostCSS tree.
 *
 * @param   root   PostCSS `Root` object.
 *
 * @returns        The first `Rule` object in the document if any, `null` otherwise.
 */
export const getFirstRule = (root: Root): Rule | null => {
	let firstRuleNode: Rule | null = null;

	// Is there a better way to get the only first **rule** node?
	root.walkRules((ruleNode) => {
		if (isKeyframesRule(ruleNode)) return;
		firstRuleNode ??= ruleNode;
	});

	return firstRuleNode;
};
