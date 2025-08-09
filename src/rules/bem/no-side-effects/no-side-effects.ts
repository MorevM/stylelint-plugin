import { isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { getBemBlock } from '#modules/bem';
import { isAtRule, isKeyframesRule, isRule } from '#modules/postcss';
import { addNamespace, createRule, getRuleUrl, mergeMessages, vMessagesSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { resolveSelectorNodes, selectorNodesToString } from '#modules/selectors';
import { toRegExp } from '#modules/shared';
import { trimBoundaryNodes } from './utils/trim-boundary-nodes';
import type postcss from 'postcss';
import type { ResolvedNode } from '#modules/selectors/types';

const RULE_NAME = 'bem/no-side-effects';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
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
			v.strictObject({
				ignore: v.optional(v.array(vStringOrRegExpSchema), []),
				messages: vMessagesSchema({
					rejected: [v.string()],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	// Identify the root BEM block for the current file.
	// If not found, this file is not considered a component — skip the rule.
	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);

	const normalizedIgnore = secondary.ignore
		.map((item) => toRegExp(item, { allowWildcard: true }));

	// Just utility function to report a suspicious selector fragment,
	// used instead of default `report`.
	const reportNodes = (node: postcss.Node, nodes: ResolvedNode[]) => {
		const selector = selectorNodesToString(nodes);
		if (normalizedIgnore.some((pattern) => pattern.test(selector))) return;

		const [firstMatch, lastMatch] = [
			nodes[0].meta.sourceMatches.at(-1)!,
			nodes.at(-1)!.meta.sourceMatches[0],
		];
		const offset = firstMatch.contextOffset + firstMatch.sourceOffset;

		const index = firstMatch.sourceRange[0] + offset;
		const endIndex = lastMatch.sourceRange[1] + offset;
		const message = messages.rejected(selector);

		report({ node, index, endIndex, message });
	};

	root.walk((node) => {
		// Do not check the block itself
		if (node === bemBlock.rule) return;
		if (isKeyframesRule(node)) return;
		// // All other constructs are irrelevant to selector analysis.
		if (!isAtRule(node, ['nest', 'at-root']) && !isRule(node)) return;

		resolveSelectorNodes({ node }).forEach(({ resolved }) => {
			// Find the last mention of the current BEM block in the resolved selector.
			// Anything after it may represent a side-effect.
			const lastBlockIndex = resolved.findLastIndex((resolvedNode) => {
				return resolvedNode.type === 'class'
					&& resolvedNode.value.startsWith(bemBlock.blockName);
			});

			// Every node is a side-effect
			if (lastBlockIndex === -1) {
				return reportNodes(node, resolved);
			}

			const sideEffectCandidates = resolved.slice(lastBlockIndex + 1);
			const sideEffectNodes = trimBoundaryNodes(sideEffectCandidates);
			if (isEmpty(sideEffectNodes)) return;

			// TODO: Skip interpolated selectors for now
			if (sideEffectNodes.some((sideEffectNode) => sideEffectNode.value?.includes('#{'))) return;

			reportNodes(node, sideEffectNodes);
		});
	});
});
