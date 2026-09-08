import * as v from 'valibot';
import { DEFAULT_SEPARATORS } from '#modules/bem';

type VSchema = v.BaseSchema<any, any, any>;

/**
 * Preserves the schema's documented properties while exposing readonly values.
 */
type VReadonlySchema<T extends VSchema> = v.GenericSchema<
	Readonly<v.InferInput<T>>,
	Readonly<v.InferOutput<T>>,
	v.InferIssue<T>
>;

/**
 * Keeps callback schemas named so declaration emission retains argument documentation.
 */
type VFunctionSchema<Arguments extends VSchema[], ReturnValue extends VSchema> = v.GenericSchema<
	(...args: { [K in keyof Arguments]: v.InferOutput<Arguments[K]> }) => v.InferInput<ReturnValue>,
	(...args: v.InferInput<v.TupleSchema<Arguments, undefined>>) => v.InferOutput<ReturnValue>,
	v.FunctionIssue
>;

const separatorEntries = {
	/**
	 * Separator between block and element.
	 *
	 * @default '__'
	 */
	element: v.optional(v.string(), DEFAULT_SEPARATORS.element),

	/**
	 * Separator between block/element and modifier name.
	 *
	 * @default '--'
	 */
	modifier: v.optional(v.string(), DEFAULT_SEPARATORS.modifier),

	/**
	 * Separator between modifier name and modifier value.
	 *
	 * @default '--'
	 */
	modifierValue: v.optional(v.string(), DEFAULT_SEPARATORS.modifierValue),
};

/**
 * Preserves separator property documentation when other schemas reference it.
 */
type VSeparatorsSchema = v.OptionalSchema<v.StrictObjectSchema<typeof separatorEntries, undefined>, undefined>;

export const vStringOrRegExpSchema = v.union([v.string(), v.instance(RegExp)]);

export const vSeparatorsSchema: VSeparatorsSchema = v.optional(v.strictObject(separatorEntries));

export const vArrayable = <T extends VSchema>(type: T) => {
	return v.union([type, v.array(type)]);
};

/**
 * Exposes readonly input and output without freezing or changing parsed values.
 *
 * @param   schema   Schema whose values should be readonly in callback contracts.
 *
 * @returns          The same runtime schema with readonly input and output types.
 */
export const vReadonly = <T extends VSchema>(schema: T): VReadonlySchema<T> => {
	return schema;
};

export const vFunction = <
	const Arguments extends VSchema[],
	ReturnValue extends VSchema,
>(
	functionArguments: Arguments,
	functionReturnValue: ReturnValue,
): VFunctionSchema<Arguments, ReturnValue> => {
	return v.pipe(
		// Callbacks receive parsed arguments and return a value for the return schema to parse.
		v.function() as v.GenericSchema<
			(...args: { [K in keyof Arguments]: v.InferOutput<Arguments[K]> }) => v.InferInput<ReturnValue>,
			(...args: unknown[]) => unknown,
			v.FunctionIssue
		>,
		v.args(v.tuple(functionArguments)),
		v.returns(functionReturnValue),
	);
};

export type { VFunctionSchema, VReadonlySchema, VSeparatorsSchema };
