import { getSassVariableReferences } from './get-sass-variable-references';

describe(getSassVariableReferences, () => {
	it('Finds plain and interpolated references in expression mode', () => {
		const references = getSassVariableReferences('$size + #{$gap}', 'expression');

		expect(references.map(({ name }) => name)).toStrictEqual(['$size', '$gap']);
	});

	it('Finds only interpolated references in interpolation mode', () => {
		const references = getSassVariableReferences(
			'$plain #{$nested} "#{$quoted}"',
			'interpolation',
		);

		expect(references.map(({ name }) => name)).toStrictEqual(['$nested', '$quoted']);
	});

	it('Preserves source ranges and module qualification', () => {
		expect(getSassVariableReferences('module.$value', 'expression')).toStrictEqual([{
			start: 7,
			end: 13,
			name: '$value',
			isModuleQualified: true,
		}]);
	});

	it('Skips escaped, commented, and quoted references', () => {
		const references = getSassVariableReferences(
			String.raw`\$escaped /* $comment */ "$quoted" $actual`,
			'expression',
		);

		expect(references.map(({ name }) => name)).toStrictEqual(['$actual']);
	});

	it('Finds references inside nested interpolations', () => {
		const references = getSassVariableReferences(
			'#{map.get($map, #{$key})}',
			'interpolation',
		);

		expect(references.map(({ name }) => name)).toStrictEqual(['$map', '$key']);
	});
});
