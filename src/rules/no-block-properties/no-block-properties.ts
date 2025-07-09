import { isEmpty } from '@morev/utils';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleDeclarations, getRuleUrl, isPseudoElementNode, mergeMessages, parseSelectors, resolveBemEntities, resolveNestedSelector, toRegExp } from '#utils';
import { vMessagesSchema, vSeparatorsSchema, vStringOrRegExpSchema } from '#valibot';
import { createPropertiesRegistry } from './utils';

const RULE_NAME = 'no-block-properties';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		unexpected: (
			propertyName: string,
			selector: string,
			context: 'block' | 'modifier' | 'utility',
			presetName: string | undefined,
		) => {
			const propertyType = (() => {
				if (presetName === 'EXTERNAL_GEOMETRY') return 'external geometry';
				if (presetName === 'POSITIONING') return 'positioning';
				if (presetName === 'CONTEXT') return 'contextual';
				return '';
			})();

			return [
				`Unexpected`,
				propertyType,
				`property "${propertyName}" within BEM Block selector "${selector}"`,
			].filter(Boolean).join(' ');
		},
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				presets: v.optional(
					v.array(v.string()),
					['EXTERNAL_GEOMETRY'],
				),
				customPresets: v.optional(
					v.objectWithRest({}, v.array(v.string())),
					{},
				),
				allowProperties: v.optional(v.array(v.string()), []),
				disallowProperties: v.optional(v.array(v.string()), []),
				perEntity: v.optional(
					v.strictObject({
						block: v.optional(v.object({
							presets: v.optional(v.array(v.string())),
							allowProperties: v.optional(v.array(v.string())),
							disallowProperties: v.optional(v.array(v.string())),
						})),
						modifier: v.optional(v.object({
							presets: v.optional(v.array(v.string())),
							allowProperties: v.optional(v.array(v.string())),
							disallowProperties: v.optional(v.array(v.string())),
						})),
						utility: v.optional(v.object({
							presets: v.optional(v.array(v.string())),
							allowProperties: v.optional(v.array(v.string())),
							disallowProperties: v.optional(v.array(v.string())),
						})),
					}),
				),
				ignoreBlocks: v.optional(v.array(vStringOrRegExpSchema), []),
				messages: vMessagesSchema({
					unexpected: [v.string(), v.string(), v.string(), v.union([v.string(), v.undefined()])],
				}),
				...vSeparatorsSchema,
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);

	const {
		disallowedProperties,
		propertyToPresetMap,
	} = createPropertiesRegistry(secondary);

	const ignorePatterns = secondary.ignoreBlocks
		.map((value) => toRegExp(value, { allowWildcard: true }));

	root.walkRules((rule) => {
		// Resolve any CSS or SASS nesting
		// `&__element` -> `.the-component__element`
		// `.the-component { .element {} }` -> `.the-component .element`
		const resolvedSelector = resolveNestedSelector(rule.selector, rule as any)[0];

		parseSelectors(resolvedSelector).forEach((selectorNodes) => {
			// Side effect selector, `.foo span`, `span .foo`
			if (selectorNodes.some((node) => node.type === 'combinator')) return;
			// `.the-component::before` is allowed
			if (isPseudoElementNode(selectorNodes.at(-1))) return;

			const compoundSelectorPart = selectorNodes.toString();
			const selectorBemEntities = resolveBemEntities(compoundSelectorPart, secondary);

			const entitiesToReport = selectorBemEntities
				// We are looking only for BEM blocks or its modifiers in the rule
				.filter((bemEntity) => !bemEntity.element)
				// Skip ignored blocks
				.filter((bemEntity) => {
					return !ignorePatterns
						.some((blockPattern) => blockPattern.test(bemEntity.block.value));
				});

			if (isEmpty(entitiesToReport)) return;

			entitiesToReport.forEach((bemEntity) => {
				const bemEntityContext = (() => {
					if (bemEntity.utility) return 'utility';
					if (bemEntity.modifierName) return 'modifier';
					return 'block';
				})();

				const declarationsToReport = getRuleDeclarations(rule, { onlyDirectChildren: true })
					.filter((declaration) => disallowedProperties[bemEntityContext].has(declaration.prop));

				declarationsToReport.forEach((declaration) => {
					report({
						message: messages.unexpected(
							declaration.prop,
							bemEntity.selector.value,
							bemEntityContext,
							propertyToPresetMap.get(declaration.prop),
						),
						node: declaration,
						word: declaration.prop,
					});
				});
			});
		});
	});
});
