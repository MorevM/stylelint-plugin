import { isComment } from '#modules/postcss/is-comment/is-comment';
import type { Node } from 'postcss';

/**
 * Recognizes comments mentioning a Stylelint directive as conservative movement boundaries.
 * Does not validate directive syntax or determine whether a rule is disabled.
 *
 * @param   node   PostCSS node to inspect.
 *
 * @returns        Whether the comment contains a `stylelint-` marker at a word boundary.
 */
export const isStylelintDirective = (node: Node | undefined): boolean => {
	return isComment(node) && /\bstylelint-/u.test(node.text);
};
