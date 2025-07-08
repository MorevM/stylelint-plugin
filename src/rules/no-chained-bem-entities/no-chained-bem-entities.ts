import { arrayUnique, isEmpty } from '@morev/utils';
import resolvedNestedSelector from 'postcss-resolve-nested-selector';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleUrl, isCssFile, parseSelectors, resolveBemEntities } from '#utils';
import { vSeparatorsSchema } from '#valibot';
import type { Node } from 'postcss';

const RULE_NAME = 'no-chained-bem-entities';

/**
 * TODO:
 * * Better name?
 * * Better messages
 * * User-defined messages
 * * Disallow splitting modifier and its value?
 * * Documentation
 * * Non-default separators tests
 */

const getParentRuleNode = (node: Node) => {
	let parent = node.parent;

	while (parent) {
		if (parent.type === 'rule') {
			return parent;
		}
		parent = parent.parent;
	}

	return null;
};

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		unknown: (name: string) => `Do not split BEM entity: "${name}"`,
		block: (name: string) => `Do not split BEM block name: "${name}"`,
		element: (name: string) => `Do not split BEM element name: "${name}"`,
		modifierName: (name: string) => `Do not split BEM modifier name: "${name}"`,
		modifierValue: (name: string) => `Do not split BEM modifier value: "${name}"`,
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

		const ruleBemEntities = resolveBemEntities(rule, secondary);

		// Consider compound selectors, e.g. `&--foo, &--bar`
		parseSelectors(rule.selector).forEach((selectorNodes) => {
			const tagNodesToCheck = selectorNodes.filter((node, index, nodes) => {
				return node.type === 'tag' && nodes[index - 1]?.type === 'nesting';
			});
			if (isEmpty(tagNodesToCheck)) return;

			tagNodesToCheck.forEach((tagNode) => {
				const nestedValue = tagNode.value;
				// Interpolated strings, `&#{$b}`
				if (!nestedValue || nestedValue.startsWith('#')) return;

				if (!VALID_START_CHARACTERS.some((char) => nestedValue.startsWith(char))) {
					const relatedBemEntities = ruleBemEntities
						.filter((bemEntity) => bemEntity.selector.value.includes(nestedValue));

					const entityType = (() => {
						if (relatedBemEntities.length > 1) return 'unknown';

						if (relatedBemEntities[0].modifierValue) return 'modifierValue';
						if (relatedBemEntities[0].modifierName) return 'modifierName';
						if (relatedBemEntities[0].element) return 'element';
						return 'block';
					})();

					report({
						message: messages[entityType](`&${nestedValue}`),
						node: rule,
						index: tagNode.sourceIndex - 1,
						endIndex: tagNode.sourceIndex + nestedValue.length,
					});
				}
			});
		});
	});
});
