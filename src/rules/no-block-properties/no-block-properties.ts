import { isEmpty, tsObject } from '@morev/utils';
import resolveNestedSelector from 'postcss-resolve-nested-selector';
import * as v from 'valibot';
import { addNamespace, createRule, getRuleDeclarations, getRuleUrl, isPseudoElementNode, parseSelectors, resolveBemEntities, toRegExp } from '#utils';
import { vSeparatorsSchema, vStringOrRegExpSchema } from '#valibot';

const RULE_NAME = 'no-block-properties';

/**
 * TODO:
 * * Per-entity allow/disallow
 * * Custom presets?
 * * Custom messages
 */

const PRESETS = {
	EXTERNAL_GEOMETRY: new Set([
		'margin',
		'margin-block', 'margin-block-start', 'margin-block-end',
		'margin-inline', 'margin-inline-start', 'margin-inline-end',
		'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	]),
	CONTEXT: new Set([
		'float', 'clear',
		'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
		'grid', 'grid-area',
		'grid-row', 'grid-row-start', 'grid-row-end',
		'grid-column', 'grid-column-start', 'grid-column-end',
		'place-self', 'align-self',
		'order',
		'counter-increment',
		'z-index',
	]),
	POSITIONING: new Set([
		'position',
		'inset',
		'inset-block', 'inset-block-start', 'inset-block-end',
		'inset-inline', 'inset-inline-start', 'inset-inline-end',
		'top', 'right', 'bottom', 'left',
	]),
};

const propertyToPresetMap = new Map<string, keyof typeof PRESETS>();

for (const [preset, properties] of tsObject.entries(PRESETS)) {
	for (const property of properties) {
		propertyToPresetMap.set(property, preset);
	}
}

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
			presetName: keyof (typeof PRESETS) | 'CUSTOM',
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
				`property "${propertyName}" within BEM Block selector ${selector}`,
			].filter(Boolean).join(' ');
		},
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				presets: v.optional(
					v.array(v.picklist(['EXTERNAL_GEOMETRY', 'CONTEXT', 'POSITIONING'])),
					['EXTERNAL_GEOMETRY'],
				),
				allowProperties: v.optional(v.array(v.string()), []),
				disallowProperties: v.optional(v.array(v.string()), []),
				ignoreBlocks: v.optional(v.array(vStringOrRegExpSchema), []),
				...vSeparatorsSchema,
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// Add disallowed properties from `presets` (if any) and `disallowProperties`
	const disallowedProperties = new Set([
		...secondary.disallowProperties,
		...secondary.presets.flatMap((presetName) => [...PRESETS[presetName]]),
	]);
	// Omit explicitly allowed ones
	secondary.allowProperties.forEach((property) => disallowedProperties.delete(property));

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

			const declarationsToReport = getRuleDeclarations(rule, { onlyDirectChildren: true })
				.filter((declaration) => disallowedProperties.has(declaration.prop));

			entitiesToReport.forEach((bemEntity) => {
				declarationsToReport.forEach((declaration) => {
					report({
						message: messages.unexpected(
							declaration.prop,
							bemEntity.selector.value,
							propertyToPresetMap.get(declaration.prop) ?? 'CUSTOM',
						),
						node: declaration,
						word: declaration.prop,
					});
				});
			});
		});
	});
});
