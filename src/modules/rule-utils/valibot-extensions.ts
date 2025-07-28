import * as v from 'valibot';
import { DEFAULT_SEPARATORS } from '#modules/bem';

type VSchema = v.BaseSchema<any, any, any>;

export const vStringOrRegExpSchema = v.union([v.string(), v.instance(RegExp)]);

export const vSeparatorsSchema = v.optional(
	v.strictObject({
		element: v.optional(v.string(), DEFAULT_SEPARATORS.element),
		modifier: v.optional(v.string(), DEFAULT_SEPARATORS.modifier),
		modifierValue: v.optional(v.string(), DEFAULT_SEPARATORS.modifierValue),
	}),
);

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

export const vMessagesSchema = <
	T extends Record<string, VSchema[]>,
>(definition: T) => {
	const shape = {} as {
		[K in keyof T]: v.OptionalSchema<ReturnType<typeof vFunction>, undefined>
	};

	// eslint-disable-next-line no-restricted-syntax, guard-for-in -- Trust me it's safe here
	for (const key in definition) {
		shape[key] = v.optional(vFunction(definition[key], v.string()));
	}

	return v.optional(v.strictObject(shape));
};
