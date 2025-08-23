import type { ChildNode, Container, Document, Node, Rule } from 'postcss';

/**
 * Checks whether a given PostCSS node is an `Rule`.
 *
 * @param   node   A PostCSS `Node` to check.
 *
 * @returns        `true` if the node is an `Rule`, otherwise `false`. \
 *                 Narrows the type to `Rule` on success.
 */
export const isRule = (
	node: Document | ChildNode | Container | Node | undefined,
): node is Rule => {
	return node?.type === 'rule';
};
