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
			categories: ['pseudo-classes', 'qualifiers:class'],
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

	it('Rejects incompatible families, ambiguous subjects and unresolved interpolation', () => {
		const root = scss.parse(`
			.card:hover, .button:hover {}
			.card.button {}
			#{$unknown} {}
		`);
		const [mixed, ambiguous, interpolated] = root.nodes as Rule[];

		expect(resolveOrderSelector(mixed, DEFAULT_SEPARATORS, new Set())).toBeNull();
		expect(resolveOrderSelector(ambiguous, DEFAULT_SEPARATORS, new Set())).toBeNull();
		expect(resolveOrderSelector(interpolated, DEFAULT_SEPARATORS, new Set())).toBeNull();
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
