import postcssScss from 'postcss-scss';
import { resolveSassDeclarations } from './resolve-sass-declarations';
import type { Rule } from 'postcss';

describe(resolveSassDeclarations, () => {
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
				resolved: { value: '.block', literalRanges: [] },
			},
			{
				name: '$item',
				resolved: { value: '.block__item', literalRanges: [[6, 12]] },
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
		});
		expect(result.variables.$menu_item).toBe('.block__menu-item');
		expect(result.variables['$menu-item']).toBe('.block__menu-item');
		expect(result.declarations[3].resolved).toStrictEqual({
			value: '.block__link',
			literalRanges: [],
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
