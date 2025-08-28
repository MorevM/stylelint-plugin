import { toArray, tsObject } from '@morev/utils';
import * as v from 'valibot';
import { isRule } from '#modules/postcss';
import { createRule, mergeMessages, vMessagesSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { toRegExp } from '#modules/shared';

const SASS_CONTROL_STRUCTURES = ['if', 'else', 'else if', 'for', 'while', 'mixin', 'function'];

export default createRule({
	scope: 'base',
	name: 'no-selectors-in-at-rules',
	meta: {
		description: 'Disallows placing rules (selectors) inside at-rules.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		unexpected: (ruleName: string, atRuleName: string) =>
			`Unexpected rule "${ruleName}" inside at-rule "${atRuleName}".`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.object({
				ignore: v.optional(
					v.objectWithRest(
						{},
						v.union([
							vStringOrRegExpSchema,
							v.array(vStringOrRegExpSchema),
						]),
					), {},
				),
				messages: vMessagesSchema({
					unexpected: [v.string(), v.string()],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);

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
			if (!isRule(node)) return;
			if (shouldIgnore(atRule.name, atRule.params)) return;

			report({
				message: messages.unexpected(node.selector, atRule.name),
				node,
				word: node.selector,
			});
		});
	});
});
