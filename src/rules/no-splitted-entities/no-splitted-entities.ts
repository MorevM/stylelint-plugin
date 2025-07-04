import { isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleUrl, isCssFile } from '#utils';

const RULE_NAME = 'no-splitted-entities';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		split: (name: string) => `Do not split BEM entity: "${name}"`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				elementSeparator: v.optional(v.string(), '__'),
				modifierSeparator: v.optional(v.string(), '--'),
				modifierValueSeparator: v.optional(v.string(), '--'),
				allowSplittedModifierValues: v.optional(v.boolean(), false),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const VALID_START_CHARACTERS = [
		secondary.elementSeparator,
		secondary.modifierSeparator,
		secondary.modifierValueSeparator,
		'.', // `&.is-active`
		'[', // `&[disabled]`
		'#', // `&[disabled]`
	];

	root.walkRules((rule) => {
		// Something not BEM-related
		if (!rule.selector.includes('&')) return;

		// `&--foo, &--bar`
		const individualSelectors = rule.selector.split(',')
			.map((item) => item.trim())
			.filter(Boolean);

		individualSelectors.forEach((selector) => {
			const nestedMatch = selector.match(/&([^ :]\S*)/);
			if (!nestedMatch) return;

			const nestedPart = nestedMatch[0];
			const cleanNestedPart = nestedMatch[1]?.split(',');
			const nestedIndex = nestedMatch.index!;
			if (isEmpty(cleanNestedPart)) return; // Something bad-formed

			// Definitely badly-formed
			if (!VALID_START_CHARACTERS.some((char) => cleanNestedPart.some((part) => part.startsWith(char)))) {
				report({
					message: messages.split(nestedPart),
					node: rule,
					index: nestedIndex,
					endIndex: nestedIndex + nestedPart.length,
				});
			}
		});
	});
});
