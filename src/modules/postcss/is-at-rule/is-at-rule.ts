import { isEmpty } from '@morev/utils';
import type { AtRule, ChildNode, Container, Document } from 'postcss';

/**
 * Checks whether a given PostCSS node is an `AtRule`,
 * optionally matching specific at-rule names.
 *
 * @param   node          A PostCSS `ChildNode` to check.
 * @param   atRuleNames   Optional list of at-rule names to match against (e.g., `'nest'`, `'at-root'`).
 *
 * @returns               `true` if the node is an `AtRule` and its name matches
 *                        one of the provided `atRuleNames` (if any), otherwise `false`. \
 *                        Narrows the type to `AtRule` on success.
 */
export const isAtRule = (
	node: Document | ChildNode | Container | undefined,
	atRuleNames?: string[],
): node is AtRule => {
	if (!node) return false;
	if (node.type !== 'atrule') return false;

	return isEmpty(atRuleNames)
		|| atRuleNames.includes((node as AtRule).name);
};
