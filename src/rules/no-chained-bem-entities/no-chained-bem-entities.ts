import * as v from 'valibot';
import { resolveBemChain } from '#modules/bem';
import { isAtRule, isRule } from '#modules/postcss';
import { addNamespace, createRule, extractSeparators, getRuleUrl, isCssFile, vSeparatorsSchema } from '#modules/rule-utils';
import type { Root } from 'postcss';
import type { Separators } from '#modules/shared';
import type { RepeatingGroup, RepeatingGroupItem, SecondaryOption, Violation } from './no-chained-bem-entities.types';

const RULE_NAME = 'no-chained-bem-entities';

/**
 * TODO:
 * * User-defined messages
 * * Configuration tests
 * * Documentation
 * * Non-default separators tests
 */

const createMessage = (type: string, correct: string) =>
	`Unexpected chained BEM ${type}. Move it to the parent level as "${correct}"`;

/**
 * Traverses the CSS AST and collects groups of repeated BEM entities of the same type
 * that are chained using `&` (e.g., `&__element { &-item {} }`,).
 *
 * @param   root         PostCSS root node.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              List of repeating BEM entity groups.
 */
const collectRepeatingGroups = (root: Root, separators: Separators): RepeatingGroup[] => {
	const repeatingGroups: RepeatingGroup[] = [];

	root.walk((rule) => {
		if (!isAtRule(rule, ['at-root', 'nest']) && !isRule(rule)) return;

		const source = isRule(rule) ? rule.selector : rule.params;
		if (!source.includes('&')) return;

		const chains = resolveBemChain(rule, separators);

		chains.forEach((chain) => {
			for (let index = 0; index < chain.length; index++) {
				const current = chain[index];

				// Skip if not the beginning of a new group
				if (
					index > 0
					&& chain[index - 1].type === current.type
				) {
					continue;
				}

				const currentType = current.type;
				const repeating: RepeatingGroupItem[] = [current];
				let i = index + 1;

				// Collect subsequent items of the same type
				while (
					i < chain.length
					&& chain[i].type === currentType
					&& chain[i].selector !== current.selector
				) {
					repeating.push(chain[i]);
					i++;
				}

				const next = chain[i];

				if (
					repeating.length > 1
					// Also report even a single modifier value if it's nested under a modifier name,
					// flat structure is required when `disallowNestedModifierValues` is `true`.
					|| (
						secondary.disallowNestedModifierValues
						&& currentType === 'modifierValue'
						&& next?.type === 'modifierName'
					)
				) {
					repeatingGroups.push({
						rule: current.rule,
						repeating,
						nextPart: next?.part,
						bemSelector: current.selector,
					});
				}
			}
		});
	});

	return repeatingGroups;
};

/**
 * Converts repeating BEM entity groups into Violation objects
 * that can later be reported by the rule.
 *
 * @param   groups      Repeating groups collected from BEM chains.
 * @param   secondary   Rule options.
 *
 * @returns             Flat list of violation objects.
 */
const getViolationsFromGroups = (
	groups: RepeatingGroup[],
	secondary: SecondaryOption,
): Violation[] => {
	const seen = new Set<string>();
	const violations: Violation[] = [];

	for (const group of groups) {
		const { repeating: [deepestEntity], nextPart } = group;
		const { type, part } = deepestEntity;

		const [index, endIndex] = part.sourceRange ?? [0, 0];
		const key = `${index}-${endIndex}-${part.selector}`;

		// Prevent duplicate warnings for the same range
		// in cases like `&__foo, &__bar { &-item {} }`
		if (seen.has(key)) continue;
		seen.add(key);

		const violationTemplate = { node: group.rule, index, endIndex };

		if (
			secondary.disallowNestedModifierValues
			&& nextPart?.type === 'modifierName'
		) {
			violations.push({
				type: 'nestedModifierValue',
				expected: `&${nextPart.selector}${part.selector}`,
				...violationTemplate,
			});
			continue;
		}

		// `nextPart` will be `undefined` for the block itself, `.foo-block`
		const expected = nextPart ? `&${part.selector}` : part.selector;

		violations.push({ type, expected, ...violationTemplate });
	}

	return violations;
};

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
	const repeatingGroups = collectRepeatingGroups(root, separators);
	const violations = getViolationsFromGroups(repeatingGroups, secondary);

	violations.forEach((violation) => {
		report({
			...violation,
			message: messages[violation.type](violation.expected),
		});
	});
});
