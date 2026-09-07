import postcss from 'postcss';
import { isDeclaration } from './is-declaration';
import type { Rule } from 'postcss';

describe(isDeclaration, () => {
	it('Recognizes a declaration node', () => {
		const root = postcss.parse(`
			.block {
				color: red;
			}
		`);
		const node = (root.first as Rule).first;

		expect(isDeclaration(node)).toBe(true);
	});

	it('Rejects non-declaration nodes', () => {
		const root = postcss.parse(`
			@media (width > 0) {}
			.block {}
		`);

		expect(isDeclaration(root)).toBe(false);
		expect(isDeclaration(root.first)).toBe(false);
		expect(isDeclaration(root.last)).toBe(false);
	});

	it('Rejects an undefined node', () => {
		expect(isDeclaration(undefined)).toBe(false);
	});
});
