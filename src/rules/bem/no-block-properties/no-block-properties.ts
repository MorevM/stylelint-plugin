import { isEmpty } from '@morev/utils';
import { isDirectBemEntity, resolveBemEntities } from '#modules/bem';
import { getRuleDeclarations, isPseudoElementNode } from '#modules/postcss';
import { createRule, extractSeparators, mergeMessages } from '#modules/rule-utils';
import { parseSelectors, resolveNestedSelector } from '#modules/selectors';
import { toRegExp } from '#modules/shared';
import { schema } from './no-block-properties.schema';
import { createPropertiesRegistry } from './utils';

export default createRule({
	scope: 'bem',
	name: 'no-block-properties',
	meta: {
		description: 'Prevents layout-affecting CSS properties within BEM block selectors.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		unexpected: (
			propertyName: string,
			selector: string,
			context: 'block' | 'modifier',
			presetName: string | undefined,
		) => {
			const propertyType = (() => {
				if (presetName === 'EXTERNAL_GEOMETRY') return 'external geometry';
				if (presetName === 'POSITIONING') return 'positioning';
				if (presetName === 'CONTEXT_DEPENDENT') return 'context-dependent';
				return '';
			})();

			return [
				`Unexpected`,
				propertyType,
				`property "${propertyName}" within BEM ${context} selector "${selector}"`,
			].filter(Boolean).join(' ');
		},
	},
	schema,
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);

	const {
		disallowedProperties,
		propertyToPresetMap,
	} = createPropertiesRegistry(secondary);

	const ignoredPatterns = secondary.ignoreBlocks
		.map((value) => toRegExp(value, { allowWildcard: true }));

	root.walkRules((rule) => {
		const resolvedSelectors = resolveNestedSelector({ node: rule });

		for (const resolvedSelector of resolvedSelectors) {
			parseSelectors(resolvedSelector.resolved).forEach((selectorNodes) => {
				// Side effect selector, `.foo span`, `span .foo`
				if (selectorNodes.some((node) => node.type === 'combinator')) return;
				// `.the-component::before` is allowed
				if (isPseudoElementNode(selectorNodes.at(-1))) return;

				const selectorBemEntities = resolveBemEntities({
					rule,
					separators,
					source: resolvedSelector.resolved,
				}).filter((bemEntity) => {
					return bemEntity.bemSelector.startsWith(resolvedSelector.parent ?? '')
						&& isDirectBemEntity(bemEntity);
				});

				const entitiesToReport = selectorBemEntities
					// We are looking only for BEM blocks or its modifiers in the rule
					.filter((bemEntity) => !bemEntity.element)
					// Skip ignored blocks
					.filter((bemEntity) => {
						return !ignoredPatterns
							.some((blockPattern) => blockPattern.test(bemEntity.block.value));
					});

				if (isEmpty(entitiesToReport)) return;

				entitiesToReport.forEach((bemEntity) => {
					const context = bemEntity.modifierName ? 'modifier' : 'block';

					const declarationsToReport = getRuleDeclarations(rule, {
						mode: 'directWithPureAtRules',
						shape: 'withPath',
					})
						.filter(({ declaration }) => {
							return disallowedProperties[context].has(declaration.prop);
						})
						.filter(({ atRulePath }) => {
							return !atRulePath.some((atRule) => {
								return ['page', 'mixin', 'function'].includes(atRule.name);
							});
						})
						.map(({ declaration }) => declaration);

					declarationsToReport.forEach((declaration) => {
						const presetName = propertyToPresetMap.get(declaration.prop);
						report({
							message: messages.unexpected(
								declaration.prop,
								bemEntity.bemSelector,
								context,
								presetName,
							),
							messageArgs: [
								'unexpected',
								declaration.prop,
								bemEntity.bemSelector,
								context,
								presetName,
							],
							node: declaration,
							word: declaration.prop,
						});
					});
				});
			});
		}
	});
});
