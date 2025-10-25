import { isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { getBemBlock } from '#modules/bem';
import { isAtRule, isKeyframesRule, isRule } from '#modules/postcss';
import { createRule, extractSeparators, mergeMessages, vMessagesSchema, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { resolveSelectorNodes } from '#modules/selectors';
import { toRegExp } from '#modules/shared';
import { createViolationsRegistry, trimBoundaryNodes } from './utils';

export default createRule({
	scope: 'bem',
	name: 'no-side-effects',
	meta: {
		description: 'Disallows selectors that apply styles outside the scope of the current BEM block.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		rejected: (selector: string) =>
			`Unexpected side-effect to another element: "${selector}"`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.object({
				ignore: v.optional(v.array(vStringOrRegExpSchema), []),
				separators: vSeparatorsSchema,
				messages: vMessagesSchema({
					rejected: [v.string()],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	// Identify the root BEM block for the current file.
	// If not found, this file is not considered a component — skip the rule.
	const separators = extractSeparators(secondary.separators);
	const bemBlock = getBemBlock(root, separators);
	if (!bemBlock) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);

	const normalizedIgnore = secondary.ignore
		.map((item) => toRegExp(item, { allowWildcard: true }));

	const { getViolations, addViolation } = createViolationsRegistry(normalizedIgnore);

	root.walk((node) => {
		// Do not check the block itself
		if (node === bemBlock.rule) return;
		if (isKeyframesRule(node)) return;
		// // All other constructs are irrelevant to selector analysis.
		if (!isAtRule(node, ['nest', 'at-root']) && !isRule(node)) return;

		resolveSelectorNodes({ node }).forEach(({ resolved }) => {
			// Incomplete input
			if (isEmpty(resolved)) return;

			// Find the last mention of the current BEM block in the resolved selector.
			// Anything after it may represent a side-effect.
			const lastBlockIndex = resolved.findLastIndex((resolvedNode) => {
				return resolvedNode.type === 'class'
					&& resolvedNode.value.startsWith(bemBlock.blockName);
			});

			// Every node is a side-effect
			if (lastBlockIndex === -1) {
				return addViolation(node, resolved);
			}

			const sideEffectCandidates = resolved.slice(lastBlockIndex + 1);
			const sideEffectNodes = trimBoundaryNodes(sideEffectCandidates);
			if (isEmpty(sideEffectNodes)) return;

			addViolation(node, sideEffectNodes);
		});
	});

	getViolations().forEach((violation) => report({
		...violation,
		message: messages.rejected(violation.selector),
		messageArgs: ['rejected', violation.selector],
	}));
});
