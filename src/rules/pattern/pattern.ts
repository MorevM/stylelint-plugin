import { isEmpty, isString, toArray } from '@morev/utils';
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
 * * Better default messages
 */

const RULE_NAME = 'pattern';

const ENTITIES_IN_ORDER = ['block', 'element', 'modifierName', 'modifierValue', 'utility'] as const;

const PATTERN_REPLACEMENT_MAP = {
	KEBAB_CASE: KEBAB_CASE_REGEXP,
	PASCAL_CASE: PASCAL_CASE_REGEXP,
	CAMEL_CASE: CAMEL_CASE_REGEXP,
	SNAKE_CASE: SNAKE_CASE_REGEXP,
} as Record<string, RegExp>;

const normalizePattern = (
	input: Arrayable<string | RegExp> | false,
): RegExp[] | false => {
	if (input === false) return false;

	return toArray(input).map((part) => {
		if (isString(part) && PATTERN_REPLACEMENT_MAP[part]) {
			return PATTERN_REPLACEMENT_MAP[part];
		}

		return toRegExp(part, { allowWildcard: true });
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
		block: (name: string) => `BEM block "${name}" does not match the pattern`,
		element: (name: string) => `BEM element "${name}" does not match the pattern`,
		modifierName: (name: string) => `BEM modifier name "${name}" does not match the pattern`,
		modifierValue: (name: string) => `BEM modifier value "${name}" does not match the pattern`,
		utility: (name: string) => `Utility class "${name}" does not match the pattern`,
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
					if (!entityPatterns) return;

					if (
						entityPatterns.every((p) => !p.test(entity.value))
						&& !hasParentViolation(rule, entityName, entity)
					) {
						violations.push({
							rule,
							entity: entityName,
							value: entity.value,
							...getViolationIndexes(rule, entity.value),
						});
					}
				});
			});
		});
	});

	violations.forEach(({ rule, entity, startIndex, endIndex, value }) => {
		report({
			node: rule,
			message: messages[entity](value),
			index: startIndex,
			endIndex,
		});
	});
});
