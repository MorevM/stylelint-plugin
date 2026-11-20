import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import type { AtRule, Node } from 'postcss';

/**
 * Recognizes function and mixin definition names using Sass's case-sensitive spelling.
 * This classifies at-rule names without validating their parameters or stylesheet language.
 *
 * @param   node   PostCSS node to classify, when present.
 *
 * @returns        Whether the node has a Sass definition name.
 */
export const isSassDefinition = (node: Node | undefined): node is AtRule & { name: 'function' | 'mixin' } => {
	return isAtRule(node, ['function', 'mixin']);
};
