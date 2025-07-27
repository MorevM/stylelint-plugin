import * as v from 'valibot';
import { resolveBemChain } from '#modules/bem';
import { isAtRule, isRule } from '#modules/postcss';
import { addNamespace, createRule, extractSeparators, getRuleUrl, isCssFile, vSeparatorsSchema } from '#modules/rule-utils';
import type { AtRule, Rule } from 'postcss';
import type { BemEntityPart, EntityType } from '#modules/bem';
import type { BemChain } from '#modules/bem/utils/resolve-bem-chain/resolve-bem-chain.types';

const RULE_NAME = 'no-chained-bem-entities';

type Violation = {
	type: EntityType | 'nestedModifierValue';
	expected: string;
	node: Rule | AtRule;
	index: number;
	endIndex: number;
};

type Entity = {
	entityType: EntityType;
	entityPart: BemEntityPart;
	bemSelector: string;
	rule: Rule | AtRule;
};

type RepeatingGroup = {
	rule: Rule | AtRule;
	repeatingEntities: Entity[];
	nextEntityPart: BemEntityPart | undefined;
	bemSelector: string;
};

/**
 * TODO:
 * * User-defined messages
 * * Documentation
 * * Non-default separators tests
 */

const createMessage = (type: string, correct: string) =>
	`Unexpected chained BEM ${type}. Move it to the parent level as "${correct}"`;

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		block: (correct: string) => createMessage('block name', correct),
		element: (correct: string) => createMessage('element name', correct),
		modifierName: (correct: string) => createMessage('modifier name', correct),
		modifierValue: (correct: string) => createMessage('modifier value', correct),
		nestedModifierValue: (correct: string) =>
			`Unexpected nested modifier value. Use a flat selector "${correct}" instead`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				...vSeparatorsSchema,
				disallowNestedModifierValues: v.optional(v.boolean(), false),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const separators = extractSeparators(secondary);

	const repeatingGroups: RepeatingGroup[] = [];
	root.walk((rule) => {
		if (!isAtRule(rule, ['at-root', 'nest']) && !isRule(rule)) return;

		const source = isRule(rule) ? rule.selector : rule.params;

		// Something not BEM-related
		if (!source.includes('&')) return;

		const chains = resolveBemChain(rule, separators);
		chains.forEach((chain) => {
			chain.forEach((chainItem, index) => {
				// Пропускаем, если это не начало группы
				if (index > 0 && chain[index - 1].entityType === chainItem.entityType) return;

				const currentType = chainItem.entityType;
				const repeating: BemChain = [chainItem];
				let i = index + 1;

				while (i < chain.length && chain[i].entityType === currentType && chain[i].bemSelector !== chainItem.bemSelector) {
					repeating.push(chain[i]);
					i++;
				}

				if (repeating.length > 1) {
					repeatingGroups.push({
						rule: chainItem.rule,
						repeatingEntities: repeating,
						nextEntityPart: chain[i]?.entityPart,
						bemSelector: chainItem.bemSelector,
					});
				}
			});
		});
	});

	const warnings = repeatingGroups.reduce<Violation[]>((acc, group) => {
		const mostDeep = group.repeatingEntities[0];
		const { entityType, entityPart } = mostDeep;
		const expected = group.nextEntityPart
			? `&${entityPart.selector}`
			: entityPart.selector;
		const [index, endIndex] = mostDeep.entityPart.sourceRange ?? [0, 0];

		// Prevent duplicated warnings in case of multiple branches
		if (acc.some((warning) => {
			return warning.index === index && warning.endIndex === endIndex && warning.expected === expected;
		})) {
			return acc;
		}

		if (group.nextEntityPart?.type === 'modifierName' && secondary.disallowNestedModifierValues) {
			acc.push({
				type: 'nestedModifierValue',
				node: group.rule,
				expected: `&${group.nextEntityPart.selector}${expected.slice(1)}`,
				index,
				endIndex,
			});
			return acc;
		}

		acc.push({
			type: entityType,
			expected,
			node: group.rule,
			index: mostDeep.entityPart.sourceRange?.[0] ?? 0,
			endIndex: mostDeep.entityPart.sourceRange?.[1] ?? 0,
		});
		return acc;
	}, []).filter(Boolean);

	warnings.forEach((warning) => {
		report({
			...warning,
			message: messages[warning.type](warning.expected),
		});
	});
});
