import { escapeRegExp, isNullish, isString } from '@morev/utils';
import * as v from 'valibot';
import { resolveBemEntities } from '#modules/bem';
import { createRule, extractSeparators, isCssFile, mergeMessages, vFunction, vMessagesSchema, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import { isSimpleSassVariableName } from '#modules/sass';
import { parseSelectors } from '#modules/selectors';
import { getSassVariableRenameFix, resolveVariableDeclarations } from './utils';
import type { ResolvedSassDeclaration } from '#modules/postcss';
import type { SelectorVariablePatternContext, SelectorVariablePatternOwner, SelectorVariablePatternResolver } from './selector-variable-pattern.types';

const vNullableString = v.nullable(v.string());
const vSelectorVariablePatternContext = v.strictObject({
	selector: v.strictObject({
		value: v.string(),
		bemSelector: v.string(),
		block: v.string(),
		element: vNullableString,
		modifierName: vNullableString,
		modifierValue: vNullableString,
	}),
	variable: v.strictObject({
		name: v.string(),
		value: v.string(),
		reference: v.nullable(v.picklist(['self', 'variable'])),
	}),
	owner: v.nullable(v.strictObject({
		selector: v.string(),
		block: vNullableString,
		depth: v.number(),
		path: v.array(v.string()),
	})),
});
const vResolverResult = v.union([v.string(), v.instance(RegExp), v.null(), v.undefined()]);

const defaultResolver: SelectorVariablePatternResolver = ({ selector, variable, owner }) => {
	// Check only variables in top-level selectors.
	if (!owner || owner.depth > 1) return;
	// Ignore selectors from another block.
	if (selector.block !== owner.block) return;
	// Ignore aliases.
	if (variable.reference === 'variable') return;
	// Blocks have no element name.
	if (!selector.element) return;

	// Modifiers may use any name containing the element name.
	// Element variables must use the exact element name.
	return selector.modifierName
		? new RegExp(escapeRegExp(selector.element))
		: selector.element;
};

export default createRule({
	scope: 'bem',
	name: 'selector-variable-pattern',
	meta: {
		description: 'Enforces naming patterns for SASS variables containing BEM selectors.',
		deprecated: false,
		fixable: true,
	},
	messages: {
		invalidName: (
			actualName: string,
			expected: string | RegExp,
			context: SelectorVariablePatternContext,
		) => {
			if (isString(expected)) {
				return [
					`Expected variable "$${actualName}" to be named "$${expected}"`,
					`for BEM selector "${context.selector.bemSelector}".`,
				].join(' ');
			}

			return [
				`Expected variable "$${actualName}" to match "${expected}"`,
				`for BEM selector "${context.selector.bemSelector}".`,
			].join(' ');
		},
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(v.strictObject({
			resolve: v.optional(
				vFunction([vSelectorVariablePatternContext], vResolverResult),
				() => defaultResolver,
			),
			separators: vSeparatorsSchema,
			messages: vMessagesSchema({
				invalidName: [v.string(), vStringOrRegExpSchema, vSelectorVariablePatternContext],
			}),
		})),
	},
}, (primary, secondary, { root, report, messages: ruleMessages }) => {
	if (isCssFile(root)) return;

	const separators = extractSeparators(secondary.separators);
	const messages = mergeMessages(ruleMessages, secondary.messages);

	const checkDeclarations = (
		declarations: ResolvedSassDeclaration[],
		owner: SelectorVariablePatternOwner | null,
	) => {
		for (const { declaration, resolved } of declarations) {
			if (
				!resolved
				|| parseSelectors(resolved.value).length !== 1
			) continue;

			const entities = resolveBemEntities({
				source: resolved.value,
				separators,
			});
			if (entities.length !== 1) continue;

			const entity = entities[0];
			const { block, element, modifierName, modifierValue } = entity;
			const context = {
				selector: {
					value: resolved.value,
					bemSelector: entity.bemSelector,
					block: block.value,
					element: element?.value ?? null,
					modifierName: modifierName?.value ?? null,
					modifierValue: modifierValue?.value ?? null,
				},
				variable: {
					name: declaration.prop.slice(1),
					value: declaration.value,
					reference: resolved.reference,
				},
				owner: owner && {
					...owner,
					path: [...owner.path],
				},
			} satisfies SelectorVariablePatternContext;
			const expected = secondary.resolve(context);
			if (isNullish(expected)) continue;

			const actualName = context.variable.name;
			const isValid = isString(expected)
				? actualName === expected
				: new RegExp(expected.source, expected.flags).test(actualName);
			if (isValid) continue;

			const fix = isString(expected) && isSimpleSassVariableName(`$${expected}`)
				? getSassVariableRenameFix(root, declaration, `$${expected}`)
				: undefined;

			report({
				message: messages.invalidName(actualName, expected, context),
				messageArgs: ['invalidName', actualName, expected, context],
				node: declaration,
				index: 0,
				endIndex: declaration.prop.length,
				...fix && { fix },
			});
		}
	};

	const rootResolution = resolveVariableDeclarations(root);
	if (!rootResolution || rootResolution.owner) return;
	checkDeclarations(rootResolution.declarations, rootResolution.owner);

	root.walkRules((rule) => {
		const resolution = resolveVariableDeclarations(rule);
		if (!resolution?.owner) return;

		const { declarations, owner } = resolution;
		const ownerEntities = resolveBemEntities({ source: owner.selector, separators });
		const ownerBlock = ownerEntities.length === 1
			? ownerEntities[0].block.value
			: null;

		checkDeclarations(declarations, {
			...owner,
			block: ownerBlock,
		});
	});
});
