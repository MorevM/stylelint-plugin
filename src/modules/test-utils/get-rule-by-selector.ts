import { isString, isUndefined } from '@morev/utils';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { getRuleContentMeta, isAtRule, isRule } from '#modules/postcss';

/**
 * Parses the given source (as a string or PostCSS root) and returns
 * the first `Rule` or `AtRule` that matches the provided selector string.
 *
 * - For regular CSS rules, `selector` is matched against `rule.selector`.
 * - For at-rules (e.g., `@media`, `@supports`), `selector` is matched against `rule.params`.
 *
 * Intended for use in tests or internal tooling, not production use.
 *
 * @param   rootOrSource   A PostCSS Root node or a raw CSS/SCSS string to be parsed.
 * @param   selector       The selector or at-rule params to match.
 *
 * @returns                The first matching `Rule` or `AtRule` node.
 *
 * @throws If no matching rule or at-rule is found for the provided selector.
 */
export const getRuleBySelector = <T extends postcss.Rule | postcss.AtRule>(
	rootOrSource: postcss.Root | string,
	selector?: string,
): T => {
	let found: postcss.Rule | postcss.AtRule | null = null;

	const root = isString(rootOrSource)
		? postcss().process(rootOrSource, { syntax: postcssScss }).root
		: rootOrSource;

	if (isUndefined(selector)) {
		const firstNode = root.nodes[0];

		if (isAtRule(firstNode) || isRule(firstNode)) {
			return firstNode as T;
		}

		throw new Error(`Rule not found`);
	}

	root.walk((rule) => {
		if (!isRule(rule) && !isAtRule(rule)) return;

		const { source: match } = getRuleContentMeta(rule);

		if (match === selector) {
			found = rule;
		}
	});

	if (!found) throw new Error(`Rule not found: ${selector}`);

	return found;
};
