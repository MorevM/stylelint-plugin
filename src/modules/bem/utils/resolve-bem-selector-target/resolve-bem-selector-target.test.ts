import { DEFAULT_SEPARATORS } from '#modules/bem';
import { getResolvedNodesSourceRange, parseSelectors, resolveSelectorNodes } from '#modules/selectors';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveBemSelectorTarget } from './resolve-bem-selector-target';

describe(resolveBemSelectorTarget, () => {
	it('Preserves the original resolved node and its authored selector-list range', () => {
		const node = getRuleBySelector(`
			.block {
				&:hover, &__item--active {}
			}
		`, '&:hover, &__item--active');
		const [, { resolved }] = resolveSelectorNodes({ node });
		const target = resolveBemSelectorTarget(resolved, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block__item--active');
		expect(target.entityNode).toBe(resolved[0]);
		expect(target.compound).toStrictEqual([...resolved]);
		expect(target.compound[0]).toBe(resolved[0]);
		expect(target.context).toStrictEqual([]);
		expect(getResolvedNodesSourceRange([target.entityNode])).toStrictEqual({ index: 9, endIndex: 24 });
	});

	it('Selects the last occurrence of the deepest direct entity', () => {
		const [nodes] = parseSelectors('.block__item.block__item--active.block__item--active:is(.one, .two)');
		const target = resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS);
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
		const target = resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block');
		expect(target.entityNode).toBe(nodes.find((node) => node.type === 'class'));
	});

	it('Treats equally specific direct entities as unknown ownership', () => {
		const [nodes] = parseSelectors('.block__item.block__label');

		expect(resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it.each([':is(.block__item, .block__label)', ':where(.block)', ':is(button, a)'])(
		'Leaves functional-only aliases unknown even with a single branch: %s',
		(selector) => {
			const [nodes] = parseSelectors(selector);

			expect(resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
		},
	);

	it.each(['main', '.block__item > main', ':not(:is(.block, .other))', ':has(.block, .other)'])(
		'Does not infer BEM ownership from tags, exclusions, or relatives: %s',
		(selector) => {
			const [nodes] = parseSelectors(selector);

			expect(resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'none' });
		},
	);

	it('Does not identify an incomplete BEM class as its partially parsed base', () => {
		const [nodes] = parseSelectors('.block--');

		expect(resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it('Separates the target from its ordered context and preserves functional combinators', () => {
		const [nodes] = parseSelectors(':is(.dark, .light) > .wrapper + .block__item:has(.icon .badge)');
		const target = resolveBemSelectorTarget(nodes, DEFAULT_SEPARATORS);
		assert(target.status === 'resolved');

		expect(target.entity.bemSelector).toBe('.block__item');
		expect(target.compound).toStrictEqual([nodes[4], nodes[5]]);
		expect(target.context).toStrictEqual([[nodes[0]], [nodes[2]]]);
		expect(target.context[0][0]).toBe(nodes[0]);
	});

	it('Leaves ownership unknown when either the target or its context contains unresolved interpolation', () => {
		const [targetNodes] = parseSelectors('.block__#{$element}');
		const [contextNodes] = parseSelectors('#{$context} .block__item');

		expect(resolveBemSelectorTarget(targetNodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
		expect(resolveBemSelectorTarget(contextNodes, DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it('Does not treat empty selector content as a known absence of ownership', () => {
		expect(resolveBemSelectorTarget([], DEFAULT_SEPARATORS)).toStrictEqual({ status: 'unknown' });
	});

	it('Respects custom separators when selecting the deepest direct entity', () => {
		const [nodes] = parseSelectors('.block-item.block-item_active:has(.other-item_wide, .badge)');
		const target = resolveBemSelectorTarget(nodes, { element: '-', modifier: '_', modifierValue: '_' });
		assert(target.status === 'resolved');

		expect(target.entity.element?.value).toBe('item');
		expect(target.entity.modifierName?.value).toBe('active');
		expect(target.entityNode).toBe(nodes[1]);
	});
});
