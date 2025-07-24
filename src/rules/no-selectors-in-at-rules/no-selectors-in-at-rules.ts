import { toArray, tsObject } from '@morev/utils';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleUrl, vStringOrRegExpSchema } from '#modules/rule-utils';
import { toRegExp } from '#modules/shared';

const RULE_NAME = 'no-selectors-in-at-rules';

const SASS_CONTROL_STRUCTURES = ['if', 'else', 'else if', 'for', 'while', 'mixin', 'function'];

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		unexpected: (blockName: string, atRuleName: string) =>
			`Unexpected rule "${blockName}" inside at-rule "${atRuleName}".`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				ignore: v.optional(
					v.objectWithRest(
						{},
						v.union([
							vStringOrRegExpSchema,
							v.array(vStringOrRegExpSchema),
						]),
					), {},
				),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	const normalizedIgnore = tsObject.entries(secondary.ignore)
		.map(([key, value]) => ({
			nameRegex: toRegExp(key, { allowWildcard: true }),
			paramRegexes: toArray(value).map((part) => toRegExp(part, { allowWildcard: true })),
		}));

	const shouldIgnore = (name: string, params: string) =>
		normalizedIgnore.some(({ nameRegex, paramRegexes }) =>
			nameRegex.test(name)
			&& paramRegexes.some((regExp) => regExp.test(params)));

	root.walkAtRules((atRule) => {
		if (SASS_CONTROL_STRUCTURES.includes(atRule.name)) return;
		if (atRule.name === 'keyframes') return;

		(atRule.nodes ?? []).forEach((node) => {
			if (node.type !== 'rule') return;
			if (shouldIgnore(atRule.name, atRule.params)) return;

			report({
				message: messages.unexpected(node.selector, atRule.name),
				node,
				word: node.selector,
			});
		});
	});
});
