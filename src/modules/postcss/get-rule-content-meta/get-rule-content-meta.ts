import { isRule } from '#modules/postcss/is-rule/is-rule';
import type { AtRule, Rule } from 'postcss';

/**
 * Metadata describing the content structure of a CSS rule or at-rule.
 */
type RuleContentMeta = {
	/**
	 * Full text of the rule's header.
	 */
	raw: string;

	/**
	 * The meaningful source part of the rule.
	 */
	source: string;

	/**
	 * Start index of `source` within `raw`.
	 */
	offset: number;
};

/**
 * Returns metadata for the meaningful content of a PostCSS rule.
 *
 * @example
 * getRuleContentMeta(rule)
 * // => { raw: '.block:hover', source: '.block:hover', offset: 0 }
 * @example
 * getRuleContentMeta(atRule)
 * // => { raw: '@at-root .block', source: '.block', offset: 9 }
 *
 * @param   node   A PostCSS `Rule` or `AtRule` node.
 *
 * @returns        An object with:
 *                 * `raw`: full text of the rule's header
 *                 * `source`: `rule.selector` or `atRule.params`
 *                 * `offset`: start index of `source` within `raw`
 */
export const getRuleContentMeta = (node: Rule | AtRule): RuleContentMeta => {
	if (isRule(node)) {
		return { raw: node.selector, source: node.selector, offset: 0 };
	}

	const afterName = node.raws.afterName ?? '';
	const raw = `@${node.name}${afterName}${node.params}`;

	const offset = (
		1 // Accounting for `@` character
		+ node.name.length
		+ afterName.length
	);

	return { raw, source: node.params, offset };
};
