import postcss from 'postcss';
import { isSameNode } from './is-same-node';

const parse = (css: string, from = 'a.css') => postcss.parse(css, { from });

describe(isSameNode, () => {
	it('Returns `true` for the same object reference', () => {
		const root = parse('.a { color:red; }');
		const decl = (root.first as postcss.Rule).first!;

		expect(isSameNode(decl, decl)).toBe(true);
	});

	it('Returns `true` for cloned node with preserved source', () => {
		const root = parse('.a { color:red; }');
		const decl = (root.first as postcss.Rule).first!;
		const cloned = decl.clone();

		expect(isSameNode(decl, cloned)).toBe(true);
	});

	it('Returns `false` for different node types even at same file/positions', () => {
		const root = parse('.a { color:red; }');
		const rule = (root.first as postcss.Rule);
		const decl = rule.first!;

		expect(isSameNode(rule, decl)).toBe(false);
	});

	it('Returns `false` for nodes from different inputs', () => {
		const rootA = parse('.a { color:red; }', 'a.css');
		const rootB = parse('.a { color:red; }', 'b.css');
		const declA = (rootA.first as postcss.Rule).first!;
		const declB = (rootB.first as postcss.Rule).first!;

		expect(isSameNode(declA, declB)).toBe(false);
	});

	it('Returns `false` for different positions within the same input', () => {
		const root = parse(`
			.a { color: red; }
			.a { color: red; }
		`);
		const decl1 = (root.nodes[0] as postcss.Rule).first!;
		const decl2 = (root.nodes[1] as postcss.Rule).first!;

		expect(isSameNode(decl1, decl2)).toBe(false);
	});

	it('Returns false when at least one node has no source mapping', () => {
		const root = parse('.a { color:red; }');
		const declWithSource = (root.first as postcss.Rule).first!;

		const synthetic = postcss.decl({ prop: 'color', value: 'red' });
		const synthetic2 = postcss.decl({ prop: 'color', value: 'red' });

		expect(isSameNode(declWithSource, synthetic)).toBe(false);
		expect(isSameNode(synthetic, synthetic2)).toBe(false); // no start/end
	});

	it('Returns `false` for nullish inputs', () => {
		const root = parse('.a { color:red; }');
		const decl = (root.first as postcss.Rule).first!;

		expect(isSameNode(null, decl)).toBe(false);
		expect(isSameNode(undefined, decl)).toBe(false);
		expect(isSameNode(null, undefined)).toBe(false);
	});
});
