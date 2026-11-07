import { quote } from '@morev/utils';
import { Declaration } from 'postcss';
import parseValue from 'postcss-value-parser';
import { getBemBlock } from '#modules/bem';
import {
	getRuleContentMeta, getRuleDeclarations, isAtRule, isNodeWithin, isRule, isSelectorOwnerNode,
} from '#modules/postcss';
import { createRule, extractSeparators, isCssFile, mergeMessages } from '#modules/rule-utils';
import { parseSelectors } from '#modules/selectors';
import { schema } from './block-variable.schema';
import type { AtRule } from 'postcss';
import type parser from 'postcss-selector-parser';
import type { Node as ValueNode } from 'postcss-value-parser';

/**
 * Selector text and its position within an at-rule's parameters.
 */
type SelectorFragment = {
	/**
	 * Selector argument without query wrappers or extension flags.
	 */
	source: string;

	/**
	 * Zero-based start of the selector argument in `AtRule.params`.
	 */
	offset: number;
};

/**
 * Extracts selector tests, scope boundaries, and extension targets.
 *
 * @param   rule   A `@supports`, `@scope`, or `@extend` at-rule.
 *
 * @returns        Selector fragments with their original parameter offsets.
 */
const getAtRuleSelectors = (rule: AtRule): SelectorFragment[] => {
	const { params } = rule;
	const isSupports = isAtRule(rule, ['supports']);

	if (isAtRule(rule, ['extend'])) {
		const lastToken = parseValue(params).nodes
			.findLast((node) => node.type !== 'space' && node.type !== 'comment');
		const source = lastToken?.type === 'word' && lastToken.value.toLowerCase() === '!optional'
			? params.slice(0, lastToken.sourceIndex)
			: params;

		return [{ source, offset: 0 }];
	}

	const fragments: SelectorFragment[] = [];

	const walk = (nodes: ValueNode[]) => {
		for (const node of nodes) {
			if (node.type !== 'function' || node.unclosed) continue;

			if (isSupports && node.value === '') {
				// Declaration conditions can contain arbitrary functions as property values.
				if (!node.nodes.some((child) => child.type === 'div' && child.value === ':')) {
					walk(node.nodes);
				}
				continue;
			}

			if (isSupports ? node.value.toLowerCase() !== 'selector' : node.value !== '') continue;

			const offset = node.sourceIndex + node.value.length + 1;
			fragments.push({ source: params.slice(offset, node.sourceEndIndex - 1), offset });
		}
	};

	walk(parseValue(params).nodes);
	return fragments;
};

export default createRule({
	scope: 'bem',
	name: 'block-variable',
	meta: {
		description: 'Requires the component\'s root selector to define a variable referencing the block name.',
		deprecated: false,
		fixable: true,
	},
	schema,
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
		hardcodedBlockName: (
			blockSelector: string,
			variableRef: string,
			context: 'root' | 'nested',
			fixable: boolean,
		) => {
			if (!fixable) {
				return `
					Hardcoded block name "${blockSelector}" found.
					Please review and replace manually with "&" or "${variableRef}", depending on intent.
					This case cannot be auto-fixed safely.
				`;
			}

			const inPosition = context === 'root'
				? `in the component's root rule`
				: `inside a descendant selector`;

			const replacement = context === 'root'
				? `"&" character`
				: `block reference variable "${variableRef}"`;

			return `
				Hardcoded block name "${blockSelector}" found ${inPosition}.
				Replace it with the ${replacement} for consistency.
			`;
		},
	},
}, (primary, secondary, { root, report, messages: ruleMessages }) => {
	// The rule only applicable to `scss` files.
	if (isCssFile(root)) return;

	const separators = extractSeparators(secondary.separators);
	const bemBlock = getBemBlock(root, separators);
	if (!bemBlock?.isBaseDeclaration) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);

	const VARIABLE_NAME = `$${secondary.name.replace(/^\$/, '')}`;
	const VALID_VALUES = (() => {
		if (secondary.interpolation === 'always') return ['#{&}'];
		if (secondary.interpolation === 'never') return ['&'];
		return ['#{&}', '&'];
	})();

	const nodeChildDeclarations = getRuleDeclarations(bemBlock.rule, {
		mode: 'direct',
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
				messageArgs: ['invalidVariableName', VARIABLE_NAME, variableDeclaration.prop],
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
			messageArgs: ['missingVariable', VARIABLE_NAME],
			node: bemBlock.rule,
			word: bemBlock.selector,
			fix: () => {
				bemBlock.rule.prepend(
					new Declaration({
						prop: VARIABLE_NAME,
						value: VALID_VALUES[0],
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
				messageArgs: ['duplicatedVariable', declaration.prop, VARIABLE_NAME],
				node: declaration,
			});
		});
		return;
	}

	if (validBlockVariable?.value && !VALID_VALUES.includes(validBlockVariable.value)) {
		return report({
			message: messages.invalidVariableValue(validBlockVariable.value, VALID_VALUES),
			messageArgs: ['invalidVariableValue', validBlockVariable.value, VALID_VALUES],
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
			messageArgs: ['variableNotFirst', VARIABLE_NAME, bemBlock.rule.selector],
			node: validBlockVariable,
			fix: () => {
				bemBlock.rule.prepend(validBlockVariable.clone());
				validBlockVariable.remove();
			},
		});
	}

	if (!secondary.replaceBlockName) return;

	const variableRef = `#{${VARIABLE_NAME}}`;
	root.walk((rule) => {
		if (!isNodeWithin(rule, bemBlock.rule)) return;
		const isSelectorAtRule = isAtRule(rule, ['supports', 'scope', 'extend']);
		if (!isSelectorAtRule && !isSelectorOwnerNode(rule)) return;

		const { source, offset } = getRuleContentMeta(rule);
		const isTopLevelRule = isRule(rule) && rule.parent === bemBlock.rule;
		const context = isTopLevelRule ? 'root' : 'nested';
		const fragments = isSelectorAtRule ? getAtRuleSelectors(rule) : [{ source, offset: 0 }];
		const selectors = fragments.flatMap((fragment) => {
			return parseSelectors(fragment.source).map((selectorNodes) => {
				const nodes = selectorNodes.flatMap((node) => {
					const descendants = [node];
					if ('nodes' in node) {
						node.walk((child) => { descendants.push(child); });
					}
					return descendants;
				});

				return {
					offset: fragment.offset,
					hasNesting: selectorNodes.some((node) => node.type === 'nesting'),
					nodesToReport: nodes
						.filter((node) => node.type === 'class')
						.filter((node) => node.toString().trim().startsWith(bemBlock.selector))
						.filter((node: parser.ClassName) => {
							const nonBlockValue = node.value.slice(bemBlock.blockName.length);
							return nonBlockValue.startsWith(separators.element)
								|| nonBlockValue.startsWith(separators.modifier)
								|| nonBlockValue.startsWith(separators.modifierValue);
						}),
				};
			});
		});
		const fixableIndices = new Set(selectors
			.filter(({ hasNesting }) => !isTopLevelRule || hasNesting)
			.flatMap((selector) => selector.nodesToReport.map((node) => selector.offset + node.sourceIndex)));

		selectors.forEach(({ hasNesting, nodesToReport, offset: selectorOffset }) => {
			if (!nodesToReport.length) return;

			const fixable = !isTopLevelRule || hasNesting;
			nodesToReport.forEach((node) => {
				report({
					message: messages.hardcodedBlockName(
						bemBlock.selector,
						variableRef,
						context,
						fixable,
					),
					messageArgs: ['hardcodedBlockName', bemBlock.selector, variableRef, context, fixable],
					node: rule,
					index: offset + selectorOffset + node.sourceIndex,
					endIndex: offset + selectorOffset + node.sourceIndex + bemBlock.selector.length,
					fix: !fixable
						? undefined
						: () => {
							const replacement = isTopLevelRule ? '&' : `#{${VARIABLE_NAME}}`;
							const fixedSource = source.replaceAll(bemBlock.selector, (match, index: number) => {
								return fixableIndices.has(index) ? replacement : match;
							});

							if (isRule(rule)) {
								rule.selector = fixedSource;
							} else {
								rule.params = fixedSource;
							}
						},
				});
			});
		});
	});
});
