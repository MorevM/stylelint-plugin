import scss from 'postcss-scss';
import { DEFAULT_SEPARATORS } from '#modules/bem';
import { resolveOrderSelector } from './resolve-order-selector';
import type { Rule } from 'postcss';

describe(resolveOrderSelector, () => {
	it('Resolves nested element states while retaining their BEM family and relative selector', () => {
		const root = scss.parse(`
			.card {
				&__title:hover {}
			}
		`);
		const nested = (root.first as Rule).first as Rule;
		const selector = resolveOrderSelector(nested, DEFAULT_SEPARATORS, new Set(['.card']));

		expect(selector).toMatchObject({
			path: [
				{ key: '.card', category: 'rules' },
				{ key: '.card__title', category: 'elements' },
			],
			categories: ['pseudo-classes'],
			localSelectors: [':hover'],
			relativeSelector: '&:hover',
			isList: false,
		});
	});

	it('Keeps a compatible selector list in one family and deduplicates its local branches', () => {
		const root = scss.parse(`
			.card:hover, .card:focus, .card:hover {}
		`);
		const selector = resolveOrderSelector(root.first as Rule, DEFAULT_SEPARATORS, new Set());

		expect(selector).toMatchObject({
			path: [{ key: '.card', category: 'rules' }],
			categories: ['pseudo-classes'],
			localSelectors: [':hover', ':focus'],
			isList: true,
		});
	});

	it('Uses the only known BEM target to distinguish an owner from a class qualifier', () => {
		const root = scss.parse(`
			.card.button:hover {}
		`);
		const rule = root.first as Rule;

		expect(resolveOrderSelector(rule, DEFAULT_SEPARATORS, new Set(['.card']))).toMatchObject({
			path: [{ key: '.card', category: 'rules' }],
			categories: ['pseudo-classes', 'qualifiers:class', 'qualifiers'],
			relativeSelector: '&.button:hover',
		});
		expect(resolveOrderSelector(rule, DEFAULT_SEPARATORS, new Set(['.card', '.button']))).toBeNull();
	});

	it('Deduplicates equivalent local branches without rewriting authored selectors', () => {
		const root = scss.parse(`
			.card:hover.foo, .card.foo:focus, .card.foo:hover {}
		`);
		const rule = root.first as Rule;
		const selector = resolveOrderSelector(rule, DEFAULT_SEPARATORS, new Set(['.card']));

		expect(selector).toMatchObject({
			localSelectors: ['.foo:hover', '.foo:focus'],
			isList: true,
		});
		expect(rule.selector).toBe('.card:hover.foo, .card.foo:focus, .card.foo:hover');
	});

	it('Keeps class qualifiers on same-block ancestors inside the internal context', () => {
		const root = scss.parse(`
			.card--compact.is-active .card__title {}
			.is-active.card--compact .card__title {}
			.theme.card--compact .card__title {}
			.card--compact:is(.is-active) .card__title {}
		`);
		const categories = (root.nodes as Rule[]).map((node) => {
			return resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set())?.path.at(-1)?.category;
		});

		expect(categories).toStrictEqual([
			'context:internal',
			'context:internal',
			'context:internal',
			'context:internal',
		]);
	});

	it('Keeps the context external when any ancestor lacks an entity from the owning block', () => {
		const root = scss.parse(`
			.theme .card--compact.is-active .card__title {}
			.card--compact.is-active .theme .card__title {}
			.theme .card__title {}
		`);
		const categories = (root.nodes as Rule[]).map((node) => {
			return resolveOrderSelector(node, DEFAULT_SEPARATORS, new Set())?.path.at(-1)?.category;
		});

		expect(categories).toStrictEqual([
			'context:external',
			'context:external',
			'context:external',
		]);
	});

	it('Preserves pseudo-element boundaries in local branch keys', () => {
		const root = scss.parse(`
			.card:hover::before, .card::before:hover {}
		`);
		const selector = resolveOrderSelector(root.first as Rule, DEFAULT_SEPARATORS, new Set());

		expect(selector).toMatchObject({
			path: [{ key: '.card' }, { key: '::before', category: 'pseudo-elements' }],
			localSelectors: [':hover::before', '::before:hover'],
			isList: true,
		});
	});

	it('Prefers categories shared by every branch despite additional qualifiers', () => {
		const root = scss.parse(`
			.card:hover.foo, .card:focus[data-active] {}
		`);
		const selector = resolveOrderSelector(root.first as Rule, DEFAULT_SEPARATORS, new Set(['.card']));

		expect(selector).toMatchObject({
			categories: ['pseudo-classes', 'qualifiers'],
			isList: true,
		});
	});

	it('Combines disjoint categories independently of branch order', () => {
		const root = scss.parse(`
			.card:hover, .card[data-active] {}
			.card[data-active], .card:hover {}
		`);
		const [forward, reversed] = root.nodes as Rule[];

		expect(resolveOrderSelector(forward, DEFAULT_SEPARATORS, new Set())).toMatchObject({
			categories: ['pseudo-classes', 'qualifiers', 'qualifiers:attribute'],
		});
		expect(resolveOrderSelector(reversed, DEFAULT_SEPARATORS, new Set())).toMatchObject({
			categories: ['pseudo-classes', 'qualifiers', 'qualifiers:attribute'],
		});
	});

	it('Rejects incompatible families, ambiguous subjects and unresolved interpolation', () => {
		const root = scss.parse(`
			.card:hover, .button:hover {}
			.card.button {}
			#{$unknown} {}
			.card:hover::before, .card:focus::after {}
		`);
		const [mixed, ambiguous, interpolated, pseudoElements] = root.nodes as Rule[];

		expect(resolveOrderSelector(mixed, DEFAULT_SEPARATORS, new Set())).toBeNull();
		expect(resolveOrderSelector(ambiguous, DEFAULT_SEPARATORS, new Set())).toBeNull();
		expect(resolveOrderSelector(interpolated, DEFAULT_SEPARATORS, new Set())).toBeNull();
		expect(resolveOrderSelector(pseudoElements, DEFAULT_SEPARATORS, new Set())).toBeNull();
	});

	it('Leaves ordinary selectors and their lists available to generic rule matchers', () => {
		const root = scss.parse(`
			h1, h2 {}
			button:hover {}
		`);
		const [list, single] = root.nodes as Rule[];

		expect(resolveOrderSelector(list, DEFAULT_SEPARATORS, new Set())).toBeUndefined();
		expect(resolveOrderSelector(single, DEFAULT_SEPARATORS, new Set())).toBeUndefined();
	});
});
