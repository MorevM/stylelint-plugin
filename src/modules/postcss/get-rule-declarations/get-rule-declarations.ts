import { isAtRule } from '#modules/postcss/is-at-rule/is-at-rule';
import { collectDeclarationsWithPath, isPureAtRule } from './utils';
import type { AtRule, Declaration, Root, Rule } from 'postcss';
import type { DeclarationWithAtRulePath, Options } from './get-rule-declarations.types';

type ToReturn<T extends Options> =
	T['mode'] extends 'directWithPureAtRules'
		? T['shape'] extends 'nodes'
			? Declaration[]
			: DeclarationWithAtRulePath[]
		: Declaration[];

/**
 * Collects declarations from a given `Rule` or `AtRule` node,
 * with flexible strategies depending on the selected `mode`.
 *
 * - In `'deep'` mode, it walks the full subtree and returns **all** declarations.
 * - In `'direct'` mode, it returns only **direct child declarations**.
 * - In `'directWithPureAtRules'` mode, it returns both direct declarations and
 * those inside **pure at-rules** (at-rules that do not contain selectors).
 * You can choose to return raw `Declaration` nodes or include their `atRulePath`.
 *
 * @param   rule      A PostCSS `Rule` or `AtRule` node to inspect.
 * @param   options   Configuration determining how declarations are collected.
 *
 * @returns           Depending on `mode` and `shape`, returns either
 *                    `Declaration[]` or `DeclarationWithAtRulePath[]`.
 */
export const getRuleDeclarations = <T extends Options>(
	rule: Rule | AtRule | Root,
	options: Partial<T> = {},
): ToReturn<T> => {
	const { mode = 'deep' } = options;

	if (mode === 'deep') {
		const declarations: Declaration[] = [];
		// `.walkDecls()` traverses all the declarations.
		rule.walkDecls((decl) => { declarations.push(decl); });
		return declarations as ToReturn<T>;
	}

	if (mode === 'direct') {
		return (rule.nodes ?? []).filter((node) => node.type === 'decl') as ToReturn<T>;
	}

	const result: DeclarationWithAtRulePath[] = (rule.nodes ?? [])
		.filter((node) => node.type === 'decl')
		.map((node) => ({ declaration: node, atRulePath: [] }));

	for (const node of rule.nodes ?? []) {
		if (!isAtRule(node)) continue;
		if (!isPureAtRule(node)) continue;

		result.push(...collectDeclarationsWithPath(node));
	}

	if ('shape' in options && options.shape === 'withPath') {
		return result as ToReturn<T>;
	}

	return result.map((entry) => entry.declaration) as ToReturn<T>;
};
