import { escapeRegExp } from '@morev/utils';
import * as v from 'valibot';
import { vFunction, vReadonly, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';
import type { SelectorVariablePatternResolver } from './selector-variable-pattern.types';

const vNullableString = v.nullable(v.string());

const vSelectorVariablePatternContext = vReadonly(v.strictObject({
	/**
	 * Resolved BEM selector represented by the variable.
	 */
	selector: vReadonly(v.strictObject({
		/**
		 * Complete resolved selector value of the SASS variable.
		 */
		value: v.string(),

		/**
		 * Complete selector of the resolved BEM entity.
		 */
		bemSelector: v.string(),

		/**
		 * Block name without the class prefix.
		 */
		block: v.string(),

		/**
		 * Element name when the entity contains an element.
		 */
		element: vNullableString,

		/**
		 * Modifier name when the entity contains a modifier.
		 */
		modifierName: vNullableString,

		/**
		 * Modifier value when the entity contains a modifier value.
		 */
		modifierValue: vNullableString,
	})),

	/**
	 * SASS variable being checked.
	 */
	variable: vReadonly(v.strictObject({
		/**
		 * Variable name without the leading `$`.
		 */
		name: v.string(),

		/**
		 * Raw value from the variable declaration.
		 */
		value: v.string(),

		/**
		 * Kind of reference that forms the complete variable value.
		 */
		reference: v.nullable(v.picklist(['self', 'variable'])),
	})),

	/**
	 * Selector that owns the variable declaration, or `null` for a root declaration.
	 */
	owner: v.nullable(vReadonly(v.strictObject({
		/**
		 * Complete resolved selector of the owner rule.
		 */
		selector: v.string(),

		/**
		 * BEM block name when the owner contains exactly one BEM entity.
		 */
		block: vNullableString,

		/**
		 * Selector nesting level of the variable declaration.
		 * At-rule wrappers do not increase the depth.
		 */
		depth: v.number(),

		/**
		 * Authored selector path from the outermost rule to the owner rule.
		 */
		path: vReadonly(v.array(v.string())),
	}))),
}));

const vResolverResult = v.union([v.string(), v.instance(RegExp), v.null(), v.undefined()]);

const vSelectorVariablePatternResolver = vFunction(
	[vSelectorVariablePatternContext] as [context: typeof vSelectorVariablePatternContext],
	vResolverResult,
);

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

export { vSelectorVariablePatternContext, vSelectorVariablePatternResolver };

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(v.strictObject({
		/**
		 * Overrides the default expected variable name or pattern for the BEM selector context.
		 *
		 * By default, plain elements require their exact name.
		 * Modified elements require the variable name to contain the element name.
		 * Other selectors are skipped.
		 */
		resolve: v.optional(vSelectorVariablePatternResolver, () => defaultResolver),

		/**
		 * Custom BEM separators.
		 */
		separators: vSeparatorsSchema,

		/**
		 * Custom message functions.
		 */
		messages: v.optional(v.strictObject({
			/**
			 * Reported when the variable name does not match the resolved expectation.
			 *
			 * @param   actualName   Actual variable name without the leading `$`.
			 * @param   expected     Exact name or regular expression returned by the resolver.
			 * @param   context      BEM selector variable context.
			 *
			 * @returns              Error message.
			 */
			invalidName: v.optional(vFunction(
				[v.string(), vStringOrRegExpSchema, vSelectorVariablePatternContext] as [
					actualName: v.StringSchema<undefined>,
					expected: typeof vStringOrRegExpSchema,
					context: typeof vSelectorVariablePatternContext,
				],
				v.string(),
			)),
		})),
	})),
};
