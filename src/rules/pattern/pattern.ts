import { isEmpty, isString, quote, toArray } from '@morev/utils';
import * as v from 'valibot';
import { CAMEL_CASE_REGEXP, KEBAB_CASE_REGEXP, PASCAL_CASE_REGEXP, SNAKE_CASE_REGEXP } from '#constants';
import { addNamespace, createRule, getRuleUrl, toRegExp } from '#utils';
import { stringOrRegExpSchema, vArrayable, vFunction } from '#valibot';
import { createViolationsRegistry, resolveBemEntities } from './utils';
import type { Arrayable } from '@morev/utils';

/**
 * TODO:
 * * Documentation
 * * Custom messages
 * * Ignore selectors
 */

const RULE_NAME = 'pattern';

const ENTITIES_IN_ORDER = ['block', 'element', 'modifierName', 'modifierValue', 'utility'] as const;

const PATTERN_REPLACEMENT_MAP = {
	KEBAB_CASE: KEBAB_CASE_REGEXP,
	PASCAL_CASE: PASCAL_CASE_REGEXP,
	CAMEL_CASE: CAMEL_CASE_REGEXP,
	SNAKE_CASE: SNAKE_CASE_REGEXP,
} as Record<string, RegExp>;

export type ProcessedPattern = { source: string; regexp: RegExp };

export const createMessage = (
	bemEntity: string,
	entityValue: string,
	patterns: ProcessedPattern[],
) => {
	const patternsString = patterns
		.map((pattern) => quote(pattern.source, '`'))
		.join(', ');

	const suffix = patterns.length === 1
		? `to match pattern ${patternsString}`
		: `to match one of the following [${patternsString}]`;

	return `Expected BEM ${bemEntity} \`${entityValue}\` ${suffix}`;
};

export const normalizePattern = (
	input: Arrayable<string | RegExp> | false,
): ProcessedPattern[] | false => {
	if (input === false) return false;

	return toArray(input).map((part) => {
		// Allow usage of string patterns like `KEBAB_CASE`
		if (isString(part) && PATTERN_REPLACEMENT_MAP[part]) {
			return { source: part, regexp: PATTERN_REPLACEMENT_MAP[part] };
		}

		return {
			source: part.toString(),
			regexp: toRegExp(part, { allowWildcard: true }),
		};
	});
};

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
				messages: v.optional(
					v.strictObject({
						block: v.optional(
							vFunction([v.string()], v.string()),
							undefined,
						),
					}),
				),
				blockPattern: v.optional(
					vArrayable(stringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				elementPattern: v.optional(
					vArrayable(stringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				modifierNamePattern: v.optional(
					vArrayable(stringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				modifierValuePattern: v.optional(
					vArrayable(stringOrRegExpSchema),
					KEBAB_CASE_REGEXP,
				),
				utilityPattern: v.optional(
					v.union([v.literal(false), vArrayable(stringOrRegExpSchema)]),
					['is-*', 'has-*', 'js-*', '-*'],
				),
				elementSeparator: v.optional(v.string(), '__'),
				modifierSeparator: v.optional(v.string(), '--'),
				modifierValueSeparator: v.optional(v.string(), '--'),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	const patterns = {
		block: normalizePattern(secondary.blockPattern),
		element: normalizePattern(secondary.elementPattern),
		modifierName: normalizePattern(secondary.modifierNamePattern),
		modifierValue: normalizePattern(secondary.modifierValuePattern),
		utility: normalizePattern(secondary.utilityPattern),
	};

	const {
		violations, getViolationIndexes, hasParentViolation,
	} = createViolationsRegistry(ENTITIES_IN_ORDER);

	root.walk((rule) => {
		if (rule.type !== 'atrule' && rule.type !== 'rule') return;
		if (rule.type === 'atrule' && rule.name !== 'at-root') return;

		resolveBemEntities(rule, secondary).forEach((bemEntity) => {
			if (!bemEntity.block) return;

			ENTITIES_IN_ORDER.forEach((entityName) => {
				const bemEntityData = bemEntity[entityName];
				if (!bemEntityData) return;

				const bemEntities = toArray(bemEntityData);
				if (isEmpty(bemEntities)) return;

				bemEntities.forEach((entity) => {
					const entityPatterns = patterns[entityName];

					// Utility classes are not allowed via the config.
					if (entityPatterns === false && entityName === 'utility') {
						violations.push({
							rule,
							entity: entityName,
							value: entity.value,
							message: messages.utility(entity.value, entityPatterns),
							...getViolationIndexes(rule, entity.value),
						});
						return;
					}
					if (!entityPatterns) return;

					if (
						entityPatterns.every((pattern) => !pattern.regexp.test(entity.value))
						&& !hasParentViolation(rule, entityName, entity)
					) {
						violations.push({
							rule,
							entity: entityName,
							value: entity.value,
							message: messages[entityName](entity.value, entityPatterns),
							...getViolationIndexes(rule, entity.value),
						});
					}
				});
			});
		});
	});

	violations.forEach(({ rule, startIndex, endIndex, message }) => {
		report({
			node: rule,
			index: startIndex,
			endIndex,
			message,
		});
	});
});
