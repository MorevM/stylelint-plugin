import postcss from 'postcss';
import { isRoot } from './is-root';

describe(isRoot, () => {
	it('Recognizes standalone roots and roots inside a document', () => {
		const root = postcss.parse('.block { color: red; }');

		expect(isRoot(root)).toBe(true);

		const document = postcss.document({ nodes: [root] });

		expect(isRoot(document.first)).toBe(true);
		expect(isRoot(document)).toBe(false);
	});

	it('Rejects other PostCSS node types', () => {
		const root = postcss.parse(`
			/* Comment */
			@media (width > 0) {
				.block { color: red; }
			}
		`);

		root.walk((node) => {
			expect(isRoot(node)).toBe(false);
		});
	});

	it('Rejects an undefined node', () => {
		expect(isRoot(undefined)).toBe(false);
	});
});
