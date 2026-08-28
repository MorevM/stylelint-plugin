import { isSimpleSassVariableName } from './is-simple-sass-variable-name';

describe(isSimpleSassVariableName, () => {
	it.each([
		'$variable',
		'$variable-name',
		'$variable_name',
		'$variable1',
		'$-private-variable',
		'$_private_variable',
	])('Recognizes "%s" as a simple variable name', (value) => {
		expect(isSimpleSassVariableName(value)).toBe(true);
	});

	it.each([
		'variable',
		'$',
		'$variable.name',
		'$variable name',
	])('Rejects "%s" as a simple variable name', (value) => {
		expect(isSimpleSassVariableName(value)).toBe(false);
	});
});
