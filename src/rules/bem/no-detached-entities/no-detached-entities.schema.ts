import { isString } from '@morev/utils';
import * as v from 'valibot';
import { vFunction, vReadonly, vSeparatorsSchema, vStringOrRegExpSchema } from '#modules/rule-utils';

const conditionSchema = v.picklist(['exists', 'shared']);

/**
 * Creates one structural policy with category-specific owners and an ordered conditional prefix.
 *
 * @param   parents   Structural ancestors that can own this entity category.
 *
 * @returns           Policy schema with validated fallback ordering.
 */
const createNestingPolicySchema = <const Parents extends readonly [string, ...string[]]>(
	parents: Parents,
) => v.pipe(
	v.array(v.union([
		v.picklist(parents),
		v.strictObject({
			/**
			 * Own structural ancestor made mandatory when a condition matches.
			 */
			parent: v.picklist(parents),

			/**
			 * Explicit declaration or multiple structural branches; arrays match either condition.
			 */
			when: v.union([conditionSchema, v.pipe(v.array(conditionSchema), v.minLength(1))]),
		}),
	])),
	v.check((entries) => {
		const firstFallback = entries.findIndex((entry) => isString(entry));
		return firstFallback === -1 || entries.slice(firstFallback).every(isString);
	}, 'Conditional parents must precede unconditional alternatives.'),
);

const nestingSchema = v.strictObject({
	/**
	 * Owners of base elements, such as `.block__title`.
	 *
	 * @default ['block']
	 */
	element: v.optional(createNestingPolicySchema(['block']), () => ['block']),

	/**
	 * Owners of block modifiers, such as `.block--compact`.
	 *
	 * @default ['block']
	 */
	blockModifier: v.optional(createNestingPolicySchema(['block']), () => ['block']),

	/**
	 * Owners of block modifier values, such as `.block--theme--dark`.
	 *
	 * @default [{ parent: 'blockModifier', when: ['exists', 'shared'] }, 'block']
	 */
	blockModifierValue: v.optional(createNestingPolicySchema(['block', 'blockModifier']), () => [
		{ parent: 'blockModifier', when: ['exists', 'shared'] },
		'block',
	]),

	/**
	 * Owners of element modifiers, such as `.block__title--large`.
	 *
	 * @default ['element']
	 */
	elementModifier: v.optional(createNestingPolicySchema(['block', 'element']), () => ['element']),

	/**
	 * Owners of element modifier values, such as `.block__title--theme--dark`.
	 *
	 * @default [{ parent: 'elementModifier', when: ['exists', 'shared'] }, 'element']
	 */
	elementModifierValue: v.optional(createNestingPolicySchema(['block', 'element', 'elementModifier']), () => [
		{ parent: 'elementModifier', when: ['exists', 'shared'] },
		'element',
	]),
});

const ownersSchema = vReadonly(v.array(vReadonly(v.object({
	/**
	 * Canonical BEM selector of an owner.
	 */
	selector: v.string(),

	/**
	 * Nearest compatible declaration line; absent when no suitable declaration exists.
	 */
	line: v.optional(v.number()),
}))));

export const schema = {
	primary: v.literal(true),
	secondary: v.optional(
		v.object({
			/**
			 * Structural ownership policies for SCSS; omitted categories retain their defaults.
			 * The first matching conditional parent is required; trailing strings are unconditional alternatives.
			 * An empty array or no matching conditions and no alternatives leaves structural nesting unrestricted.
			 * Local extensions always require their complete entity, including in native CSS.
			 */
			nesting: v.optional(nestingSchema, () => v.getDefaults(nestingSchema)),

			/**
			 * BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
			 *
			 * @default { element: '__', modifier: '--', modifierValue: '--' }
			 */
			separators: vSeparatorsSchema,

			/**
			 * Canonical BEM target selectors to ignore, including modifiers but excluding local extensions.
			 * Plain strings match complete selectors and support wildcards; `/pattern/flags` strings are expressions.
			 * Ignored entities remain owners and do not exempt their descendants.
			 *
			 * @default []
			 */
			ignore: v.optional(v.array(vStringOrRegExpSchema), []),

			/**
			 * Custom message functions for rule violations.
			 */
			messages: v.optional(v.strictObject({
				/**
				 * Custom message for a BEM entity or local extension declared outside its lexical owner.
				 *
				 * @param   selector   Complete resolved local selector, including extensions.
				 * @param   owners     Allowed canonical BEM owners and their compatible declaration locations.
				 * @param   path       Shortest configured nesting path when intermediate owners are missing; otherwise empty.
				 *
				 * @returns            The error message to report.
				 */
				detached: v.optional(vFunction(
					[v.string(), ownersSchema, ownersSchema] as [
						selector: v.StringSchema<undefined>,
						owners: typeof ownersSchema,
						path: typeof ownersSchema,
					],
					v.string(),
				)),
			})),
		}),
	),
};
