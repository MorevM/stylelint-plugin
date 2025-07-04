import * as v from 'valibot';

export const vArrayable = <
	T extends v.BaseSchema<any, any, any>,
>(type: T) => {
	return v.union([type, v.array(type)]);
};

export const vFunction = <
	const Arguments extends Array<v.BaseSchema<any, any, any>>,
	ReturnValue extends v.BaseSchema<any, any, any>,
>(functionArguments: Arguments, functionReturnValue: ReturnValue) => {
	return v.pipe(
		v.function(),
		v.args(v.tuple(functionArguments)),
		v.returns(functionReturnValue),
	);
};
