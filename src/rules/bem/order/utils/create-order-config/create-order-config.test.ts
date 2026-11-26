import scss from 'postcss-scss';
import { DEFAULT_SEPARATORS } from '#modules/bem';
import { resolveOrderSelector } from '../resolve-order-selector/resolve-order-selector';
import { createOrderConfig } from './create-order-config';
import type { AtRule, Rule } from 'postcss';

describe(createOrderConfig, () => {
	it('Keeps the first matching property priority across literals, groups and the remainder', () => {
		const root = scss.parse('gap: 0; overflow-wrap: normal; -webkit-appearance: none; color: red;');
		const config = createOrderConfig({
			order: ['declarations'],
			categories: {
				declarations: [
					'*', ['grid-gap', 'word-wrap'], 'overflow-wrap',
					[{ properties: [/appearance$/u], label: 'Native controls' }, 'appearance'],
				],
			},
		});

		const ranks = root.nodes.map((node) => config.getRank({ node, nodes: [node] }));

		expect(ranks.map(({ inner }) => inner)).toStrictEqual([1, 1, 3, 0]);
		expect(ranks[2].label?.text).toBe('Native controls');
	});

	it('Normalizes literal parameter spacing in outer matchers and category orders', () => {
		const root = scss.parse(`
			@media (--tablet) {}
			@media ( --tablet ) {}
		`);
		const config = createOrderConfig({
			order: [{ type: 'at-rule', name: 'media', parameter: ' ( --tablet ) ' }, 'at-rules'],
			categories: { 'at-rules': [{ type: 'at-rule', name: 'media', parameter: '(  --tablet  )' }] },
		});

		for (const node of root.nodes) {
			expect(config.getRank({ node, nodes: [node] })).toMatchObject({ outer: 0, inner: 0 });
		}
	});

	it('Preserves significant whitespace inside quoted parameter values', () => {
		const node = scss.parse('@include theme( "two  words", red );').first as AtRule;
		const sameValue = createOrderConfig({
			order: [{ type: 'at-rule', name: 'include', parameter: 'theme("two  words", red)' }, 'at-rules'],
		});
		const differentValue = createOrderConfig({
			order: [{ type: 'at-rule', name: 'include', parameter: 'theme("two words",red)' }, 'at-rules'],
		});

		expect(sameValue.getRank({ node, nodes: [node] }).outer).toBe(0);
		expect(differentValue.getRank({ node, nodes: [node] }).outer).toBe(1);
	});

	it('Prefers a common category over an earlier category belonging to only one branch', () => {
		const node = scss.parse('.card:hover.foo, .card:focus[data-active] {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set(['.card'])) ?? undefined;
		const config = createOrderConfig({
			order: ['qualifiers:class', 'pseudo-classes', 'qualifiers:attribute', 'rules'],
		});

		expect(config.getRank({ node, nodes: [node], selector })).toMatchObject({
			outer: 1, category: 'pseudo-classes',
		});
	});

	it('Uses configuration priority when several categories are common', () => {
		const node = scss.parse('.card:hover.foo, .card.foo:focus {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set(['.card'])) ?? undefined;
		const item = { node, nodes: [node], selector };
		const classesFirst = createOrderConfig({ order: ['qualifiers:class', 'pseudo-classes'] });
		const pseudosFirst = createOrderConfig({ order: ['pseudo-classes', 'qualifiers:class'] });

		expect(classesFirst.getRank(item).category).toBe('qualifiers:class');
		expect(pseudosFirst.getRank(item).category).toBe('pseudo-classes');
	});

	it('Uses configuration priority for disjoint categories regardless of branch order', () => {
		const root = scss.parse(`
			.card:hover, .card[data-active] {}
			.card[data-active], .card:hover {}
		`);
		const [forward, reversed] = root.nodes as Rule[];
		const forwardSelector = resolveOrderSelector(forward, DEFAULT_SEPARATORS, new Set()) ?? undefined;
		const reversedSelector = resolveOrderSelector(reversed, DEFAULT_SEPARATORS, new Set()) ?? undefined;
		const config = createOrderConfig({ order: ['qualifiers:attribute', 'pseudo-classes'] });

		expect(config.getRank({ node: forward, nodes: [forward], selector: forwardSelector }).category)
			.toBe('qualifiers:attribute');
		expect(config.getRank({ node: reversed, nodes: [reversed], selector: reversedSelector }).category)
			.toBe('qualifiers:attribute');
	});

	it('Uses rules when no specific category is configured, including an outer wildcard', () => {
		const node = scss.parse('.card[data-active], .card:hover {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set()) ?? undefined;
		const item = { node, nodes: [node], selector };
		const rules = createOrderConfig({ order: ['rules'] });
		const wildcard = createOrderConfig({ order: ['*'] });
		const unspecified = createOrderConfig({ order: [] });

		expect(rules.getRank(item).category).toBe('rules');
		expect(wildcard.getRank(item).category).toBe('rules');
		expect(unspecified.getRank(item).category).toBe('rules');
	});

	it('Uses the first listed qualifier type for disjoint branches in either order', () => {
		const root = scss.parse(`
			a.card, .card[hidden] {}
			.card[hidden], a.card {}
		`);
		const config = createOrderConfig({ order: ['qualifiers', 'qualifiers:type', 'qualifiers:attribute'] });

		for (const node of root.nodes as Rule[]) {
			const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set());

			expect(config.getRank({ node, nodes: [node], selector: selector ?? undefined }))
				.toMatchObject({ outer: 1, category: 'qualifiers:type' });
		}
	});

	it('Falls back to rules when shared categories are omitted instead of selecting one branch category', () => {
		const node = scss.parse('.card:hover.foo, .card:focus[data-active] {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set(['.card'])) ?? undefined;
		const config = createOrderConfig({ order: ['qualifiers:class', 'rules'] });

		expect(config.getRank({ node, nodes: [node], selector })).toMatchObject({
			outer: 1, category: 'rules',
		});
	});

	it('Checks specific list categories before an earlier generic rule fallback', () => {
		const node = scss.parse('.card:hover, .card:focus {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set()) ?? undefined;
		const config = createOrderConfig({ order: ['rules', 'pseudo-classes'] });

		expect(config.getRank({ node, nodes: [node], selector })).toMatchObject({
			outer: 1, category: 'pseudo-classes',
		});
	});

	it('Retains explicit matcher precedence while selecting the list category from configuration', () => {
		const node = scss.parse('.card:hover.foo, .card:focus[data-active] {}').first as Rule;
		const selector = resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set(['.card'])) ?? undefined;
		const config = createOrderConfig({
			order: ['qualifiers:class', 'pseudo-classes', { type: 'rule', selector: /^\.card/u, label: 'States' }],
		});

		expect(config.getRank({ node, nodes: [node], selector })).toMatchObject({
			outer: 2, category: 'pseudo-classes', label: { text: 'States' },
		});
	});
});
