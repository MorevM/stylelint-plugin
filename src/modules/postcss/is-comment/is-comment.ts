import type { ChildNode, Comment, Container, Document, Node } from 'postcss';

/**
 * Checks whether a given PostCSS node is a `Comment`.
 *
 * @param   node   PostCSS node to check.
 *
 * @returns        `true` when the node is a `Comment`; otherwise, `false`.
 */
export const isComment = (
	node: Document | ChildNode | Container | Node | undefined,
): node is Comment => {
	return node?.type === 'comment';
};
