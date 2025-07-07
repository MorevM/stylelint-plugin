import * as v from 'valibot';

type VSchema = v.BaseSchema<any, any, any>;

export const vStringOrRegExpSchema = v.union([v.string(), v.instance(RegExp)]);

export const vSeparatorsSchema = {
	elementSeparator: v.optional(v.string(), '__'),
	modifierSeparator: v.optional(v.string(), '--'),
	modifierValueSeparator: v.optional(v.string(), '--'),
};

export const vArrayable = <T extends VSchema>(type: T) => {
	return v.union([type, v.array(type)]);
};

export const vFunction = <
	const Arguments extends VSchema[],
	ReturnValue extends VSchema,
>(
	functionArguments: Arguments,
	functionReturnValue: ReturnValue,
) => {
	return v.pipe(
		v.function(),
		v.args(v.tuple(functionArguments)),
		v.returns(functionReturnValue),
	);
};
