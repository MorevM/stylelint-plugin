import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import type { Node } from 'postcss';

/**
 * Recognizes Sass conditional and loop directives using their case-sensitive names.
 * An else-if branch has the name `else`; its condition belongs to the parameters.
 *
 * @param   node   PostCSS node to classify, when present.
 *
 * @returns        Whether the node names a Sass conditional branch or loop.
 */
export const isSassControlRule = (node: Node | undefined): boolean => {
	return isAtRule(node, ['each', 'else', 'for', 'if', 'while']);
};
