import { isStylelintDirective } from '../is-stylelint-directive/is-stylelint-directive';
import type { ChildNode, Container, Document } from 'postcss';

/**
 * Checks a node and its descendants for comments that may affect Stylelint behavior.
 *
 * @param   node   Node or subtree whose movement could relocate a directive.
 *
 * @returns        Whether the node or a descendant contains a directive marker.
 */
export const hasStylelintDirective = (node: ChildNode | Container | Document): boolean => {
	return isStylelintDirective(node)
		|| ('nodes' in node && Boolean(node.nodes?.some((child) => hasStylelintDirective(child))));
};
