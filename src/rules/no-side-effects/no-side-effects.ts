import { isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { stringOrRegExpSchema } from '#constants';
import { addNamespace, createRule, getBemBlock, getRuleUrl, isCssFile, isKeyframesRule, parseSelectors, toRegExp } from '#utils';
import type parser from 'postcss-selector-parser';

const RULE_NAME = 'no-side-effects';

const hasNestingBefore = (selectorNode: parser.Node) => {
	let prevNode = selectorNode.prev();
	while (prevNode) {
		if (prevNode.type === 'nesting') return true;
		if (prevNode.type === 'combinator') return false;
		prevNode = prevNode.prev();
	}

	return false;
};

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		rejected: (selector: string) => `Unexpected side-effect to another element: "${selector}"`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				allow: v.optional(v.array(v.picklist(['<TAG>', '<ID>'])), []),
				ignore: v.optional(v.array(stringOrRegExpSchema), []),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	const isCss = isCssFile(root);

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	const normalizedIgnore = secondary.ignore.map((item) => toRegExp(item));

	root.walk((node) => {
		// Do not check the selector itself
		if (node === bemBlock.rule) return;
		if (node.type === 'comment' || node.type === 'decl') return;
		if (node.type === 'atrule' && node.name !== 'at-root') return;
		if (isKeyframesRule(node)) return;

		const originalSelector = node.type === 'rule'
			? node.selector
			: node.params;

		const atRuleOffset = node.type === 'atrule'
			// +1 because of `@`
			// +1 because PostCSS index starts with `1`
			? node.name.length + 2
			: 0;

		const selectors = parseSelectors(originalSelector);

		selectors.forEach((selectorNodes) => {
			if (isEmpty(selectorNodes)) return;

			const lastSideEffectIndex = selectorNodes
				.findLastIndex((selectorNode) => {
					return (
						(
							selectorNode.type === 'id'
							&& !secondary.allow.includes('<ID>')
						)
						|| selectorNode.type === 'class'
						|| (
							selectorNode.type === 'tag'
							// Allow `#{$element} { ... }`
							&& !selectorNode.value.startsWith('#{')
							&& !secondary.allow.includes('<TAG>')
						)
					// Allow `&.is-active`, `&#id` and so on
					) && !hasNestingBefore(selectorNode);
				});

			if (lastSideEffectIndex === -1) return;

			const lastNestingIndex = selectorNodes
				.findLastIndex((selectorNode) => selectorNode.type === 'nesting');

			if (lastNestingIndex > lastSideEffectIndex - 1) return;

			let errorIndex = selectorNodes[lastSideEffectIndex].sourceIndex;
			const selector = (() => {
				let current: parser.Node | undefined = selectorNodes[lastSideEffectIndex];
				const result = [current.toString().trim()];

				while (
					current
					&& (current.prev()?.type === 'class'
						|| current.prev()?.type === 'tag'
						|| current.prev()?.type === 'id')
				) {
					current = current.prev();
					if (current) {
						errorIndex = current.sourceIndex;
					}
					result.push(current!.toString());
				}

				return result;
			})().reverse().join('');

			if (normalizedIgnore.some((regExp) => regExp.test(selector))) return;
			if (
				(isCss && !selector.includes(bemBlock.selector))
				|| (!isCss && !selector.startsWith(bemBlock.selector))
			) {
				report({
					message: messages.rejected(selector),
					node,
					index: errorIndex + atRuleOffset,
					endIndex: errorIndex + atRuleOffset + selector.length,
				});
			}
		});
	});
});
