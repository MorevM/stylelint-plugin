import type { ChildNode, Container, Document, Node, Root } from 'postcss';

/**
 * Checks whether a given PostCSS node is a `Root`.
 *
 * @param   node   PostCSS node to check.
 *
 * @returns        `true` when the node is a `Root`; otherwise, `false`.
 */
export const isRoot = (
	node: Document | ChildNode | Container | Node | undefined,
): node is Root => {
	return node?.type === 'root';
};
