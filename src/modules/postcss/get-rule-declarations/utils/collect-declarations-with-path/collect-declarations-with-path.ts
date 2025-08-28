import type { AtRule, ChildNode } from 'postcss';
import type { DeclarationWithAtRulePath } from '../../get-rule-declarations.types';

type Frame = { node: ChildNode; path: AtRule[] };

/**
 * Collects all declarations contained within a given **pure at-rule**,
 * along with the full chain of at-rules leading to each declaration.
 *
 * Traverses the at-rule tree depth-first using an explicit stack, and
 * returns each declaration together with the path of nested at-rules
 * that enclose it.
 *
 * @example
 * ```scss
 * @media (min-width: 768px) {
 *   @supports (display: grid) {
 *     color: red;
 *   }
 * }
 * ```
 * Produces:
 * [
 *   {
 *     declaration: <Decl "color: red">,
 *     atRulePath: [<AtRule "@media">, <AtRule "@supports">]
 *   }
 * ]
 *
 * @param   rootAtRule   The root pure at-rule node to collect declarations from.
 *
 * @returns              An array of declarations with their corresponding at-rule path.
 */
export const collectDeclarationsWithPath = (
	rootAtRule: AtRule,
): DeclarationWithAtRulePath[] => {
	const result: DeclarationWithAtRulePath[] = [];
	const stack: Frame[] = (rootAtRule.nodes ?? [])
		.map((node) => ({ node, path: [rootAtRule] }));

	while (stack.length) {
		const { node, path } = stack.pop()!;

		if (node.type === 'decl') {
			result.push({ declaration: node, atRulePath: path });
			continue;
		}

		if (node.type === 'atrule') {
			const inner = node.nodes ?? [];
			for (let i = inner.length - 1; i >= 0; i--) {
				stack.push({ node: inner[i], path: [...path, node] });
			}
		}
	}

	return result.reverse();
};
