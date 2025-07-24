import { isEmpty, toArray } from '@morev/utils';
import * as v from 'valibot';
import { resolveBemEntities } from '#modules/bem';
import { addNamespace, createRule, getRuleUrl, mergeMessages, vArrayable, vMessagesSchema, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { KEBAB_CASE_REGEXP, toRegExp } from '#modules/shared';
import { createMessage, createViolationsRegistry, normalizePattern } from './utils';
import type { ProcessedPattern } from './selector-pattern.types';

/**
 * TODO:
 * * Требовать значение модификатора, если название модификатора не удовлетворяет чему-то?
 */

const RULE_NAME = 'selector-pattern';

// Defines processing order for BEM entities to respect parent-child dependency
const ENTITIES_IN_ORDER = ['block', 'element', 'modifierName', 'modifierValue', 'utility'] as const;

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		block: (name: string, patterns: ProcessedPattern[]) =>
			createMessage('block', name, patterns),
		element: (name: string, patterns: ProcessedPattern[]) =>
			createMessage('element', name, patterns),
		modifierName: (name: string, patterns: ProcessedPattern[]) =>
			createMessage('modifier name', name, patterns),
		modifierValue: (name: string, patterns: ProcessedPattern[]) =>
			createMessage('modifier value', name, patterns),
		utility: (name: string, patterns: false | ProcessedPattern[]) => {
			if (patterns === false) {
				return 'Utility classes are not allowed according to the configuration';
			}

			return createMessage('utility class', name, patterns);
		},
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				messages: vMessagesSchema({
					block: [v.string(), v.any()],
					element: [v.string(), v.any()],
					modifierName: [v.string(), v.any()],
					modifierValue: [v.string(), v.any()],
					utility: [v.string(), v.any()],
				}),
				blockPattern: v.optional(
					vArrayable(vStringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				elementPattern: v.optional(
					vArrayable(vStringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				modifierNamePattern: v.optional(
					vArrayable(vStringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				modifierValuePattern: v.optional(
					vArrayable(vStringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				utilityPattern: v.optional(
					v.union([v.literal(false), vArrayable(vStringOrRegExpSchema)]),
					['is-*', 'has-*', 'js-*', '-*'],
				),
				ignoreBlocks: v.optional(
					v.array(vStringOrRegExpSchema),
					[],
				),
				...vSeparatorsSchema,
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	// Normalize all configured patterns to internal RegExp format,
	// resolve string wildcards and keywords like 'KEBAB_CASE'.
	const patterns = {
		block: normalizePattern(secondary.blockPattern),
		element: normalizePattern(secondary.elementPattern),
		modifierName: normalizePattern(secondary.modifierNamePattern),
		modifierValue: normalizePattern(secondary.modifierValuePattern),
	};

	const separators = {
		elementSeparator: secondary.elementSeparator,
		modifierSeparator: secondary.modifierSeparator,
		modifierValueSeparator: secondary.modifierValueSeparator,
	};

	const messages = mergeMessages(ruleMessages, secondary.messages);

	// Precompile ignore list for block names
	const ignoreBlocks = toArray(secondary.ignoreBlocks)
		.map((entry) => toRegExp(entry, { allowWildcard: true }));

	const { violations, hasParentViolation } = createViolationsRegistry(ENTITIES_IN_ORDER);

	root.walk((rule) => {
		if (rule.type !== 'atrule' && rule.type !== 'rule') return;
		if (rule.type === 'atrule' && rule.name !== 'at-root') return;

		resolveBemEntities({ rule, separators }).forEach((bemEntity) => {
			if (!bemEntity.block) return;
			if (ignoreBlocks.some((pattern) => pattern.test(bemEntity.block.value))) return;

			ENTITIES_IN_ORDER.forEach((entityName) => {
				const bemEntityData = bemEntity[entityName];
				if (!bemEntityData) return;

				const bemEntities = toArray(bemEntityData);
				if (isEmpty(bemEntities)) return;

				bemEntities.forEach((entityPart) => {
					const entityPatterns = patterns[entityName];

					// Special case: utility classes can be completely forbidden via `false`
					const isDisallowedEntity = entityPatterns === false && entityName === 'utility';

					// Determine whether this entity violates the configured patterns
					const shouldReport = isDisallowedEntity || (
						entityPatterns?.every((pattern) => !pattern.regexp.test(entity.value))
						&& !hasParentViolation(rule, entityName, entity)
					);

					shouldReport && violations.push({
						rule,
						entityPart,
						value: entityPart.value,
						// Intentionally loosened type for utility scenario (might be `false`)
						message: messages[entityName](entityPart.value, bemEntity.bemSelector, entityPatterns as any),
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
