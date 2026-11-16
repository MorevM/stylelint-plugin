import scss from 'postcss-scss';
import { findPropertyOrderConflict } from './find-property-order-conflict';
import type { Rule } from 'postcss';

describe(findPropertyOrderConflict, () => {
	it('Reports a reversed shorthand dependency', () => {
		const original = ['margin', 'color', 'margin-top'];

		expect(findPropertyOrderConflict(original, ['color', 'margin-top', 'margin'], (name) => name))
			.toStrictEqual(['margin', 'margin-top']);
	});

	it('Does not report conflicts when independent properties move', () => {
		const original = ['margin', 'color', 'margin-top'];

		expect(findPropertyOrderConflict(original, ['color', 'margin', 'margin-top'], (name) => name))
			.toBeUndefined();
	});

	it('Distinguishes declarations of the same property and detects reversed fallbacks', () => {
		const root = scss.parse(`
			.card {
				display: block;
				display: grid;
			}
		`);
		const { nodes } = root.first as Rule;
		const conflict = findPropertyOrderConflict(
			nodes, nodes.toReversed(), (node) => (node.type === 'decl' ? node.prop : undefined),
		);

		expect(conflict?.[0]).toBe(nodes[0]);
		expect(conflict?.[1]).toBe(nodes[1]);
	});

	it('Does not mistake reordered non-declaration nodes for cascade conflicts', () => {
		const root = scss.parse(`
			.card {
				margin: 1rem;
				@include theme;
				margin-top: 2rem;
			}
		`);
		const { nodes } = root.first as Rule;
		const [margin, include, marginTop] = nodes;
		const conflict = findPropertyOrderConflict(
			nodes, [include, margin, marginTop], (node) => (node.type === 'decl' ? node.prop : undefined),
		);

		expect(conflict).toBeUndefined();
	});
});
