import { DEFAULT_SEPARATORS } from '#modules/bem';
import { getResolvedNodesSourceRange, parseSelectors, resolveSelectorNodes, splitSelectorCompounds } from '#modules/selectors';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveBemCompoundTarget } from './resolve-bem-compound-target';

describe(resolveBemCompoundTarget, () => {
	it('Preserves the original resolved node and its authored selector-list range', () => {
		const node = getRuleBySelector(`
			.block {
				&:hover, &__item--active {}
			}
		`, '&:hover, &__item--active');
		const [, { resolved }] = resolveSelectorNodes({ node });
		const target = resolveBemCompoundTarget(resolved, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block__item--active');
		expect(target.entityNode).toBe(resolved[0]);
		expect(getResolvedNodesSourceRange([target.entityNode])).toStrictEqual({ index: 9, endIndex: 24 });
	});

	it('Selects the last occurrence of the deepest direct entity', () => {
		const [nodes] = parseSelectors('.block__item.block__item--active.block__item--active:is(.one, .two)');
		const target = resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block__item--active');
		expect(target.entityNode).toBe(nodes[2]);
	});

	it.each([
		'.block:is(:hover, :focus)',
		'.block:is(.block--compact, .block--wide)',
		':is(.block__item, .block__label).block',
		'.block:where(.block__item, .block__label)',
		'.block:has(.icon, .badge)',
		'.block:not(.disabled, .loading)',
		'.block:nth-child(2n of :is(.block__item, .block__label))',
	])('Keeps the direct target despite pseudo-class conditions: %s', (selector) => {
		const [nodes] = parseSelectors(selector);
		const target = resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block');
		expect(target.entityNode).toBe(nodes.find((node) => node.type === 'class'));
	});

	it('Treats equally specific direct entities as unknown ownership', () => {
		const [nodes] = parseSelectors('.block__item.block__label');

		expect(resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it.each([':is(.block__item, .block__label)', ':where(.block)', ':is(button, a)'])(
		'Leaves functional-only aliases unknown even with a single branch: %s',
		(selector) => {
			const [nodes] = parseSelectors(selector);

			expect(resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
		},
	);

	it.each(['main', ':not(:is(.block, .other))', ':has(.block, .other)'])(
		'Does not infer BEM ownership from tags, exclusions, or relatives: %s',
		(selector) => {
			const [nodes] = parseSelectors(selector);

			expect(resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'none' });
		},
	);

	it('Does not identify an incomplete BEM class as its partially parsed base', () => {
		const [nodes] = parseSelectors('.block--');

		expect(resolveBemCompoundTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it('Resolves the target compound independently of a functional ancestor', () => {
		const [nodes] = parseSelectors(':is(.dark, .light) .block__item');
		const target = resolveBemCompoundTarget(splitSelectorCompounds(nodes).at(-1)!, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block__item');
	});

	it('Respects custom separators when selecting the deepest direct entity', () => {
		const [nodes] = parseSelectors('.block-item.block-item_active:has(.other-item_wide, .badge)');
		const target = resolveBemCompoundTarget(nodes, { element: '-', modifier: '_', modifierValue: '_' });
		assert(target.status === 'resolved');

		expect(target.entity.element?.value).toBe('item');
		expect(target.entity.modifierName?.value).toBe('active');
		expect(target.entityNode).toBe(nodes[1]);
	});
});
