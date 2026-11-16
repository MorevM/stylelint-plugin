import { isEmpty } from '@morev/utils';
import type { AtRule, ChildNode, Container, Document, Node } from 'postcss';

/**
 * Name-comparison behavior for an at-rule filter.
 */
type Options = {
	/**
	 * Ignores ASCII letter case in both the node name and the requested names.
	 * Non-ASCII characters are compared exactly.
	 *
	 * @default false
	 */
	ignoreCase?: boolean;
};

const toAsciiLowerCase = (value: string) => value.replaceAll(/[A-Z]/gu, (letter) => letter.toLowerCase());

/**
 * Checks whether a given PostCSS node is an `AtRule`,
 * optionally matching specific at-rule names.
 *
 * @param   node          A PostCSS `ChildNode` to check.
 * @param   atRuleNames   Optional list of at-rule names to match against (e.g., `'nest'`, `'at-root'`).
 * @param   options       Explicit name-comparison settings, independent of the stylesheet language.
 *
 * @returns               `true` if the node is an `AtRule` and its name matches
 *                        one of the provided `atRuleNames` (if any), otherwise `false`. \
 *                        Narrows the type to `AtRule` on success.
 */
export const isAtRule = (
	node: Document | ChildNode | Container | Node | undefined,
	atRuleNames?: string[],
	options?: Options,
): node is AtRule => {
	if (!node) return false;
	if (node.type !== 'atrule') return false;
	if (isEmpty(atRuleNames)) return true;

	const { name } = node as AtRule;
	if (!options?.ignoreCase) return atRuleNames.includes(name);

	const normalized = toAsciiLowerCase(name);
	return atRuleNames.some((expected) => toAsciiLowerCase(expected) === normalized);
};
