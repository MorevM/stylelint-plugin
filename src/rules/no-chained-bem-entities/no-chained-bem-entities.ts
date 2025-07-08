import { arrayUnique, isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleUrl, isCssFile, parseSelectors, resolveBemEntities } from '#utils';
import { vSeparatorsSchema } from '#valibot';
import { resolveMostSpecificEntity } from './utils';

const RULE_NAME = 'no-chained-bem-entities';

/**
 * TODO:
 * * User-defined messages
 * * Disallow splitting modifier and its value?
 * * Documentation
 * * Non-default separators tests
 */

const createMessage = (type: string, correct: string) =>
	`Unexpected chained BEM ${type}. Move it to the parent level as "${correct}"`;

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		block: (correct: string) => createMessage('block name', correct),
		element: (correct: string) => createMessage('element name', correct),
		modifierName: (correct: string) => createMessage('modifier name', correct),
		modifierValue: (correct: string) => createMessage('modifier value', correct),
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				...vSeparatorsSchema,
				allowSplittedModifierValues: v.optional(v.boolean(), false),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const VALID_START_CHARACTERS = arrayUnique([
		secondary.elementSeparator,
		secondary.modifierSeparator,
		secondary.allowSplittedModifierValues && secondary.modifierValueSeparator,
	]).filter(Boolean);

	root.walkRules((rule) => {
		// Something not BEM-related
		if (!rule.selector.includes('&')) return;

		// Consider compound selectors, e.g. `&--foo, &--bar`
		parseSelectors(rule.selector).forEach((selectorNodes) => {
			const chainedTagNodes = selectorNodes.filter((node, index, nodes) => {
				return node.type === 'tag' && nodes[index - 1]?.type === 'nesting';
			});
			if (isEmpty(chainedTagNodes)) return;

			chainedTagNodes.forEach((tagNode) => {
				const nestedValue = tagNode.value;
				// Interpolated strings, e.g. `&#{$b}`
				if (!nestedValue || nestedValue.startsWith('#')) return;

				if (!VALID_START_CHARACTERS.some((char) => nestedValue.startsWith(char))) {
					const bemEntity = resolveBemEntities(rule, secondary, { source: `&${nestedValue}`	})[0];
					if (!bemEntity) return;

					const [entityValue, entityType] = resolveMostSpecificEntity(bemEntity);

					report({
						message: messages[entityType](entityValue),
						node: rule,
						// `- 1` to include the '&' character, since `tagNode` starts after it.
						index: tagNode.sourceIndex - 1,
						endIndex: tagNode.sourceIndex + nestedValue.length,
					});
				}
			});
		});
	});
});
