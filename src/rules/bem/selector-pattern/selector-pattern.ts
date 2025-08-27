import { isEmpty, toArray } from '@morev/utils';
import * as v from 'valibot';
import { BEM_ENTITIES, resolveBemEntities } from '#modules/bem';
import { createRule, extractSeparators, mergeMessages, vArrayable, vMessagesSchema, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { KEBAB_CASE_NUMERIC_REGEXP, KEBAB_CASE_REGEXP, toRegExp } from '#modules/shared';
import { createMessage, createViolationsRegistry, normalizePattern } from './utils';
import type { ProcessedPattern } from './selector-pattern.types';

export default createRule({
	scope: 'bem',
	name: 'selector-pattern',
	meta: {
		description: 'Enforces naming patterns for BEM entities.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		block: (entityValue: string, fullSelector: string, patterns: ProcessedPattern[]) =>
			createMessage('block', entityValue, fullSelector, patterns),
		element: (entityValue: string, fullSelector: string, patterns: ProcessedPattern[]) =>
			createMessage('element', entityValue, fullSelector, patterns),
		modifierName: (name: string, fullSelector: string, patterns: ProcessedPattern[]) =>
			createMessage('modifier name', name, fullSelector, patterns),
		modifierValue: (entityValue: string, fullSelector: string, patterns: ProcessedPattern[] | false) => {
			if (patterns === false) {
				return 'Modifier values are not allowed according to the configuration';
			}

			return createMessage('modifier value', entityValue, fullSelector, patterns);
		},
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				patterns: v.optional(
					v.strictObject({
						block: v.optional(
							vArrayable(vStringOrRegExpSchema),
							KEBAB_CASE_REGEXP,
						),
						element: v.optional(
							vArrayable(vStringOrRegExpSchema),
							KEBAB_CASE_NUMERIC_REGEXP,
						),
						modifierName: v.optional(
							vArrayable(vStringOrRegExpSchema),
							KEBAB_CASE_REGEXP,
						),
						modifierValue: v.optional(
							v.union([v.literal(false), vArrayable(vStringOrRegExpSchema)]),
							KEBAB_CASE_NUMERIC_REGEXP,
						),
					}),
					{
						block: KEBAB_CASE_REGEXP,
						element: KEBAB_CASE_NUMERIC_REGEXP,
						modifierName: KEBAB_CASE_REGEXP,
						modifierValue: KEBAB_CASE_NUMERIC_REGEXP,
					},
				),
				ignoreBlocks: v.optional(
					v.array(vStringOrRegExpSchema),
					[],
				),
				separators: vSeparatorsSchema,
				messages: vMessagesSchema({
					block: [v.string(), v.string(), v.any()],
					element: [v.string(), v.string(), v.any()],
					modifierName: [v.string(), v.string(), v.any()],
					modifierValue: [v.string(), v.string(), v.any()],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	// Normalize all configured patterns to internal RegExp format,
	// resolve string wildcards and keywords like 'KEBAB_CASE'.
	const patterns = {
		block: normalizePattern(secondary.patterns.block),
		element: normalizePattern(secondary.patterns.element),
		modifierName: normalizePattern(secondary.patterns.modifierName),
		modifierValue: normalizePattern(secondary.patterns.modifierValue),
	};

	const separators = extractSeparators(secondary.separators);
	const messages = mergeMessages(ruleMessages, secondary.messages);

	// Precompile ignore list for block names
	const ignoreBlocks = toArray(secondary.ignoreBlocks)
		.map((entry) => toRegExp(entry, { allowWildcard: true }));

	const { violations, hasParentViolation } = createViolationsRegistry();

	root.walk((rule) => {
		if (rule.type !== 'atrule' && rule.type !== 'rule') return;
		if (rule.type === 'atrule' && rule.name !== 'at-root') return;

		resolveBemEntities({ rule, separators }).forEach((bemEntity) => {
			if (ignoreBlocks.some((pattern) => pattern.test(bemEntity.block.value))) return;

			BEM_ENTITIES.forEach((entityType) => {
				const bemEntityPart = bemEntity[entityType];
				if (!bemEntityPart) return;

				const bemEntityParts = toArray(bemEntityPart);
				if (isEmpty(bemEntityParts)) return;

				bemEntityParts.forEach((entityPart) => {
					const entityPatterns = patterns[entityType];

					// Special case: modifier values can be completely forbidden via `false`
					const isDisallowedEntity = entityPatterns === false
						&& entityType === 'modifierValue';

					// Determine whether this entity violates the configured patterns
					const shouldReport = isDisallowedEntity || (
						entityPatterns
						&& entityPatterns.every((pattern) => !pattern.regexp.test(entityPart.value))
						&& !hasParentViolation(bemEntity, entityType, entityPart)
					);

					shouldReport && violations.push({
						rule,
						entityPart,
						selector: bemEntity.bemSelector,
						value: entityPart.value,
						// Intentionally loosened type for modifier values scenario (might be `false`)
						message: messages[entityType](entityPart.value, bemEntity.bemSelector, entityPatterns as any),
					});
				});
			});
		});
	});

	violations.forEach(({ rule, entityPart, message }) => {
		report({
			node: rule,
			index: entityPart.sourceRange?.[0] ?? 0,
			endIndex: entityPart.sourceRange?.[1] ?? rule.toString().length,
			message,
		});
	});
});
