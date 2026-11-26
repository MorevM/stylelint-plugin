import postcss from 'postcss';
import scss from 'postcss-scss';
import { preservePropertyOrder } from './preserve-property-order';
import type { Rule } from 'postcss';

describe(preservePropertyOrder, () => {
	it('Reorders independent declarations while preserving shorthand and fallback precedence', () => {
		const root = postcss.parse(`
			.card {
				margin: 1rem;
				color: red;
				margin-top: 2rem;
				margin-top: var(--spacing);
			}
		`);
		const declarations = (root.first as Rule).nodes;
		const [margin, color, marginTop, fallback] = declarations;
		const preferred = [color, fallback, marginTop, margin];
		const sorted = preservePropertyOrder(
			declarations, preferred, (node) => (node.type === 'decl' ? node.prop : undefined),
		);

		expect(sorted).toStrictEqual([color, margin, marginTop, fallback]);
		expect(declarations).toStrictEqual([margin, color, marginTop, fallback]);
	});

	it('Applies the preferred order without constraints between independent properties', () => {
		const original = ['display', 'color', 'width'];
		const preferred = ['width', 'color', 'display'];

		expect(preservePropertyOrder(original, preferred, (name) => name)).toStrictEqual(preferred);
		expect(preferred).toStrictEqual(['width', 'color', 'display']);
	});

	it('Lets independent writers change places on either side of a reset', () => {
		const original = ['color', 'display', 'all', 'margin', 'padding', '--accent'];
		const preferred = ['--accent', 'padding', 'margin', 'all', 'display', 'color'];

		expect(preservePropertyOrder(original, preferred, (name) => name))
			.toStrictEqual(['--accent', 'display', 'color', 'all', 'padding', 'margin']);
	});

	it('Allows non-declaration nodes to move without dropping declaration dependencies', () => {
		const root = scss.parse(`
			.card {
				margin: 1rem;
				@include theme;
				margin-top: 2rem;
			}
		`);
		const { nodes } = root.first as Rule;
		const [margin, include, marginTop] = nodes;
		const sorted = preservePropertyOrder(
			nodes, [include, marginTop, margin], (node) => (node.type === 'decl' ? node.prop : undefined),
		);

		expect(sorted).toStrictEqual([include, margin, marginTop]);
		expect(sorted[0]).toBe(include);
	});
});
