import postcss from 'postcss';
import { getRoot } from './get-root';

describe(getRoot, () => {
	it('Returns `Root` for any attached node', () => {
		const root = postcss.parse(`
			.foo { color: red; }
		`);

		const rule = root.first!;
		const decl = (rule as any).first!;

		expect(getRoot(rule)).toBe(root);
		expect(getRoot(decl)).toBe(root);
	});

	it('Returns `Root` for nodes inside `@media` and nested rules', () => {
		const root = postcss.parse(`
			@media (min-width: 600px) {
				.foo {
					&:hover {
						color: red;
					}
				}
			}
		`);

		const at = root.first!; // @media
		const rule = (at as any).first!; // .foo
		const nested = (rule).first!; // &:hover
		const decl = (nested).first!; // color: red

		expect(getRoot(at)).toBe(root);
		expect(getRoot(rule)).toBe(root);
		expect(getRoot(nested)).toBe(root);
		expect(getRoot(decl)).toBe(root);
	});

	it('Returns `Root` when called with `Root` itself', () => {
		const root = postcss.parse(`/* empty */`);

		expect(getRoot(root)).toBe(root);
	});

	it('Returns `null` for a freshly created (detached) node', () => {
		const detachedDecl = postcss.decl({ prop: 'color', value: 'red' });

		expect(getRoot(detachedDecl as any)).toBeNull();

		const detachedRule = postcss.rule({ selector: '.foo' });

		expect(getRoot(detachedRule as any)).toBeNull();

		const detachedAt = postcss.atRule({ name: 'media', params: '(min-width: 600px)' });

		expect(getRoot(detachedAt as any)).toBeNull();
	});

	it('Returns `null` after a node was removed from the tree', () => {
		const root = postcss.parse(`
			.foo {
				color: red;
			}
		`);

		const rule = root.first!; // .foo { ... }
		const decl = (rule as any).first!; // color: red

		(rule as any).remove();

		expect(getRoot(rule)).toBeNull();
		expect(getRoot(decl)).toBeNull();
	});
});
