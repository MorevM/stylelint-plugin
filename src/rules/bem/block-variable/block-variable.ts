import { quote } from '@morev/utils';
import { Declaration } from 'postcss';
import * as v from 'valibot';
import { getBemBlock } from '#modules/bem';
import { getRuleDeclarations } from '#modules/postcss';
import { addNamespace, createRule, extractSeparators, isCssFile, mergeMessages, vMessagesSchema, vSeparatorsSchema } from '#modules/rule-utils';
import { parseSelectors } from '#modules/selectors';
import type { Rule } from 'postcss';
import type parser from 'postcss-selector-parser';

const RULE_NAME = 'bem/block-variable';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		description: 'Requires the component\'s root selector to define a variable referencing the block name.',
		deprecated: false,
		fixable: true,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				name: v.optional(v.string(), 'b'),
				interpolation: v.optional(v.picklist(['always', 'never', 'ignore']), 'always'),
				firstChild: v.optional(v.boolean(), true),
				replaceBlockName: v.optional(v.boolean(), true),
				separators: vSeparatorsSchema,
				messages: vMessagesSchema({
					missingVariable: [v.string()],
					variableNotFirst: [v.string(), v.string()],
					invalidVariableName: [v.string(), v.string()],
					invalidVariableValue: [v.string(), v.array(v.string())],
					duplicatedVariable: [v.string(), v.string()],
					hardcodedBlockName: [v.string(), v.string()],
				}),
			}),
		),
	},
	messages: {
		missingVariable: (validName: string) => {
			return `
				Missing block reference variable "${validName}".
				Declare it in the component's root selector to reference the block consistently.
			`;
		},
		variableNotFirst: (validName: string, selector: string) => {
			return `
				Block reference variable "${validName}" is not the first declaration in selector "${selector}".
				Place it at the top to keep a consistent structure across components.
			`;
		},
		invalidVariableName: (validName: string, actualName: string) => {
			return `
				Block reference variable is present, but its name is invalid.
				Expected "${validName}", but got "${actualName}".
			`;
		},
		invalidVariableValue: (actualValue: string, allowedValues: string[]) => {
			const allowedValuesString = allowedValues
				.map((value) => quote(value, '"'))
				.join(' or ');

			return `
				Block reference variable value is invalid.
				Expected ${allowedValuesString}, but got "${actualValue}".
			`;
		},
		duplicatedVariable: (foundName: string, validName: string) => {
			return `
				Multiple block reference variables detected, including "${foundName}".
				Expected a single one named "${validName}".
			`;
		},
		hardcodedBlockName: (blockSelector: string, variableName: string) => {
			return `
				Hardcoded block name "${blockSelector}" found inside a nested selector.
				Replace it with the block reference variable ${variableName} for consistency.
			`;
		},
	},
}, (primary, secondary, { root, report, messages: ruleMessages }) => {
	// The rule only applicable to `scss` files.
	if (isCssFile(root)) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);
	const separators = extractSeparators(secondary.separators);

	const VARIABLE_NAME = `$${secondary.name.replace(/^\$/, '')}`;
	const VALID_VALUES = (() => {
		if (secondary.interpolation === 'always') return ['#{&}'];
		if (secondary.interpolation === 'never') return ['&'];
		return ['#{&}', '&'];
	})();

	const nodeChildDeclarations = getRuleDeclarations(bemBlock.rule, {
		onlyDirectChildren: true,
	});

	const allBlockVariableDeclarations = nodeChildDeclarations
		.filter((declaration) => {
			return VALID_VALUES.includes(declaration.value)
				|| declaration.prop === VARIABLE_NAME;
		});

	const validBlockVariable = allBlockVariableDeclarations
		.find((declaration) => declaration.prop === VARIABLE_NAME);

	if (allBlockVariableDeclarations.length === 1) {
		const variableDeclaration = allBlockVariableDeclarations[0];

		if (variableDeclaration.prop !== VARIABLE_NAME) {
			report({
				message: messages.invalidVariableName(VARIABLE_NAME, variableDeclaration.prop),
				node: variableDeclaration,
				fix: () => {
					variableDeclaration.prop = VARIABLE_NAME;
				},
			});
			return;
		}
	}

	if (allBlockVariableDeclarations.length === 0) {
		report({
			message: messages.missingVariable(VARIABLE_NAME),
			node: bemBlock.rule,
			word: bemBlock.selector,
			fix: () => {
				bemBlock.rule.prepend(
					new Declaration({
						prop: VARIABLE_NAME,
						value: VALID_VALUES[0],
						// @ts-expect-error -- Not described in types,
						// but for compatibility with other rules it should be here,
						// since Declaration is just a superset of Node.
						// Blocker: https://github.com/stylelint-scss/stylelint-scss/pull/1159
						source: bemBlock.rule.source,
						raws: {
							before: '\n\t',
							between: ': ',
							value: {
								value: VALID_VALUES[0],
								raw: VALID_VALUES[0],
							},
						},
					}),
				);

				if (bemBlock.rule.nodes.length === 1) {
					bemBlock.rule.raws.semicolon = true;
					bemBlock.rule.raws.after = '\n';
				}
			},
		});
	}

	if (allBlockVariableDeclarations.length > 1) {
		allBlockVariableDeclarations.forEach((declaration) => {
			// Do not report the correct one.
			if (declaration.prop === VARIABLE_NAME) return;

			report({
				message: messages.duplicatedVariable(declaration.prop, VARIABLE_NAME),
				node: declaration,
			});
		});
		return;
	}

	if (validBlockVariable?.value && !VALID_VALUES.includes(validBlockVariable.value)) {
		return report({
			message: messages.invalidVariableValue(validBlockVariable.value, VALID_VALUES),
			node: validBlockVariable,
			fix: () => {
				validBlockVariable.value = VALID_VALUES[0];
			},
		});
	}

	if (
		secondary.firstChild
		&& validBlockVariable?.value
		&& nodeChildDeclarations[0] !== validBlockVariable
	) {
		report({
			message: messages.variableNotFirst(VARIABLE_NAME, bemBlock.rule.selector),
			node: validBlockVariable,
			fix: () => {
				bemBlock.rule.prepend(validBlockVariable.clone());
				validBlockVariable.remove();
			},
		});
	}

	const isNestedWithinBlock = (rule: Rule) => {
		let parentRule = rule.parent;

		while (parentRule !== root) {
			if (parentRule === bemBlock.rule) return true;
			parentRule = parentRule?.parent as any;
		}

		return false;
	};

	secondary.replaceBlockName && root.walkRules((rule) => {
		if (!isNestedWithinBlock(rule)) return;

		parseSelectors(rule.selector).forEach((selectorNodes) => {
			const nodesToReport = selectorNodes
				.filter((node) => node.type === 'class')
				.filter((node) => node.toString().trim().startsWith(bemBlock.selector))
				.filter((node: parser.ClassName) => {
					const nonBlockValue = node.value.slice(bemBlock.blockName.length);
					return nonBlockValue.startsWith(separators.element)
						|| nonBlockValue.startsWith(separators.modifier)
						|| nonBlockValue.startsWith(separators.modifierValue);
				});

			if (!nodesToReport.length) return;

			nodesToReport.forEach((node) => {
				report({
					message: messages.hardcodedBlockName(bemBlock.selector, `#{${VARIABLE_NAME}}`),
					node: rule,
					index: node.sourceIndex,
					endIndex: node.sourceIndex + bemBlock.selector.length,
					fix: () => {
						rule.selector = rule.selector
							.replaceAll(bemBlock.selector, `#{${VARIABLE_NAME}}`);
					},
				});
			});
		});
	});
});
