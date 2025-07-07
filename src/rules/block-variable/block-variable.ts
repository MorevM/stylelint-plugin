import { quote, stripIndent } from '@morev/utils';
import { Declaration } from 'postcss';
import * as v from 'valibot';
import { addNamespace, createRule, getBemBlock, getRuleDeclarations, getRuleUrl, isCssFile, parseSelectors } from '#utils';
import type { Rule } from 'postcss';

const RULE_NAME = 'block-variable';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
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
			}),
		),
	},
	messages: {
		lack: (validValue: string) => {
			return `The component lacks a variable referencing the block: "${validValue}"`;
		},
		first: (validValue: string, selector: string) => {
			return `The variable "${validValue}" referencing the block should be the first child of selector "${selector}"`;
		},
		wrongName: (validName: string, actualName: string) => {
			return stripIndent(`
				The component has the variable referencing the block, but its name is wrong.
				Expected "${validName}", but got "${actualName}".
			`);
		},
		wrongValue: (actualValue: string, availableValues: string[]) => {
			const neededValues = availableValues.map((value) => quote(value, '"')).join(' or ');
			return stripIndent(`
				The component has the variable referencing the block, but its value is wrong.
				Expected ${neededValues}, but got "${actualValue}".
			`);
		},
		extra: (nonValid: string, validName: string) => {
			return stripIndent(`
				Unexpected extra variable referencing the block "${nonValid}".
				Expected a single one named "${validName}".
			`);
		},
		replacement: (blockName: string, variableName: string) => {
			return stripIndent(`
				Unexpected inline notation of the component name "${blockName}".
				Replace it with a variable "${variableName}".
			`);
		},
	},
}, (primary, secondary, { root, report, messages }) => {
	// The rule only applicable to `scss` files.
	if (isCssFile(root)) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

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
				message: messages.wrongName(VARIABLE_NAME, variableDeclaration.prop),
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
			message: messages.lack(VARIABLE_NAME),
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
						source: bemBlock.rule.source,
						raws: {
							before: '\n\t',
							value: {
								value: VALID_VALUES[0],
								raw: `${VALID_VALUES[0]};\n`,
							},
						},
					}),
				);
			},
		});
	}

	if (allBlockVariableDeclarations.length > 1) {
		allBlockVariableDeclarations.forEach((declaration) => {
			// Do not report the correct one.
			if (declaration.prop === VARIABLE_NAME) return;

			report({
				message: messages.extra(declaration.prop, VARIABLE_NAME),
				node: declaration,
			});
		});
		return;
	}

	if (validBlockVariable?.value && !VALID_VALUES.includes(validBlockVariable.value)) {
		report({
			message: messages.wrongValue(validBlockVariable.value, VALID_VALUES),
			node: validBlockVariable,
			fix: () => {
				validBlockVariable.value = VALID_VALUES[0];
			},
		});
		return;
	}

	if (
		secondary.firstChild
		&& validBlockVariable?.value
		&& nodeChildDeclarations[0] !== validBlockVariable
	) {
		report({
			message: messages.first(VARIABLE_NAME, bemBlock.rule.selector),
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
				.filter((node) => node.toString().trim().startsWith(bemBlock.selector));

			if (!nodesToReport.length) return;

			nodesToReport.forEach((node) => {
				report({
					message: messages.replacement(bemBlock.selector, `#{${VARIABLE_NAME}}`),
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
