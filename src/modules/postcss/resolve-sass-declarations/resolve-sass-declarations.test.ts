import postcssScss from 'postcss-scss';
import { getRootSassVariables, resolveSassDeclarations, withRootSassScope } from './resolve-sass-declarations';
import type { Declaration, Rule } from 'postcss';

describe(resolveSassDeclarations, () => {
	it('Scans the root once for complete bindings and source-order lookups', () => {
		const root = postcssScss.parse('$name: first; .one {} $name: second; .two {}');
		const [, firstRule, secondDeclaration, lastRule] = root.nodes;
		const iterator = vi.spyOn(root.nodes, Symbol.iterator);

		withRootSassScope(root, 'read', () => {
			expect(getRootSassVariables(root).$name).toBe('second');
			expect(resolveSassDeclarations(root, { stopBefore: firstRule }).variables.$name).toBe('first');
			expect(resolveSassDeclarations(root, { stopBefore: secondDeclaration }).variables.$name).toBe('first');
			expect(resolveSassDeclarations(root, { stopBefore: lastRule }).variables.$name).toBe('second');
			expect(getRootSassVariables(root).$name).toBe('second');
		});

		expect(iterator).toHaveBeenCalledTimes(1);
	});

	it('Reads changes during a fix, after the fix and after the rule returns', () => {
		const root = postcssScss.parse('$name: first; $name: last;');
		const first = root.first as Declaration;
		const last = root.last as Declaration;

		withRootSassScope(root, 'read', () => {
			expect(getRootSassVariables(root).$name).toBe('last');

			withRootSassScope(root, 'edit', () => {
				root.prepend(last.remove());

				expect(getRootSassVariables(root).$name).toBe('first');

				first.value = 'edited';
			});

			expect(getRootSassVariables(root).$name).toBe('edited');
		});

		first.remove();

		expect(getRootSassVariables(root).$name).toBe('last');
	});

	it('Resolves direct declarations sequentially and stops at the requested child', () => {
		const root = postcssScss.parse(`
			.block {
				$b: #{&};
				$item: #{$b}__item;
				&__nested {}
				$late: #{$b}__late;
			}
		`);
		const rule = root.first as Rule;
		const nestedRule = rule.nodes.find((node) => node.type === 'rule');
		const result = resolveSassDeclarations(rule, {
			context: '.block',
			stopBefore: nestedRule,
		});

		expect(result.declarations.map(({ declaration, resolved }) => ({
			name: declaration.prop,
			resolved,
		}))).toStrictEqual([
			{
				name: '$b',
				resolved: { value: '.block', literalRanges: [], reference: 'self' },
			},
			{
				name: '$item',
				resolved: { value: '.block__item', literalRanges: [[6, 12]], reference: null },
			},
		]);
		expect(result.variables).not.toHaveProperty('$late');
	});

	it('Uses SASS-equivalent names for subsequent lookups in both directions', () => {
		const root = postcssScss.parse(`
			.block {
				$menu_item: #{&}__menu-item;
				$alias: #{$menu-item};
				$link-name: #{&}__link;
				$link_alias: #{$link_name};
			}
		`);
		const result = resolveSassDeclarations(root.first as Rule, { context: '.block' });

		expect(result.declarations[1].resolved).toStrictEqual({
			value: '.block__menu-item',
			literalRanges: [],
			reference: 'variable',
		});
		expect(result.variables.$menu_item).toBe('.block__menu-item');
		expect(result.variables['$menu-item']).toBe('.block__menu-item');
		expect(result.declarations[3].resolved).toStrictEqual({
			value: '.block__link',
			literalRanges: [],
			reference: 'variable',
		});
	});

	it('Does not resolve a reference declared later in the same container', () => {
		const root = postcssScss.parse(`
			.block {
				$early: #{$late}__item;
				$late: #{&};
			}
		`);
		const result = resolveSassDeclarations(root.first as Rule, { context: '.block' });

		expect(result.declarations[0].resolved).toBeNull();
	});
});
