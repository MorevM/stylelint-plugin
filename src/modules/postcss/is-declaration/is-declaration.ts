import type { ChildNode, Container, Declaration, Document, Node } from 'postcss';

/**
 * Checks whether a given PostCSS node is a `Declaration`.
 *
 * @param   node   PostCSS node to check.
 *
 * @returns        `true` when the node is a `Declaration`; otherwise, `false`.
 */
export const isDeclaration = (
	node: Document | ChildNode | Container | Node | undefined,
): node is Declaration => {
	return node?.type === 'decl';
};
