import rule from '../order';
import type { OrderSorter, OrderSortItem, SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

const aspectRatio = (item: OrderSortItem) => {
	const [, first, second] = /:(\d+)\/(\d+)/u.exec(item.parameter!)!;

	return Number(first) / Number(second);
};

testRule({
	description: 'Sorting breakpoint mixins with an at-rule matcher',
	config: [true, {
		order: [
			'sass:includes',
			'declarations',
			{
				type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u,
				sort: ((items, context) => {
					expect(context.container).toStrictEqual({ type: 'rule', selector: '.card' });
					expect(context.category).toBe('sass:includes');
					expect(items.map((item) => item.name)).toStrictEqual(['layout.from', 'layout.from']);

					return context.sort(items, { by: 'dimension' });
				}) satisfies OrderSorter,
			},
		],
		categories: {
			'sass:includes': { order: ['theme.surface'], unspecified: 'ignore' },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts matching mixins even when the category ignores unlisted calls',
		code: `
			.card {
				@include theme.surface;
				display: grid;
				@include layout.from(60rem) {}
				@include layout.from(40rem) {}
			}
		`,
		fixed: `
			.card {
				@include theme.surface;
				display: grid;
				@include layout.from(40rem) {}
				@include layout.from(60rem) {}
			}
		`,
		warnings: [{
			message: messages.expectedBefore('@include layout.from(40rem)', '@include layout.from(60rem)'),
		}],
	}],
});

testRule({
	description: 'Sorting context for semantic owners',
	config: [true, {
		categories: {
			'bem:elements': {
				sort: ((items, context) => {
					expect(context.category).toBe('bem:elements');
					expect(context.family).toMatchObject([{ key: '.card' }]);

					return context.sort(items, { by: 'name' });
				}) satisfies OrderSorter,
			},
			'declarations': {
				sort: ((items, context) => {
					expect(context.category).toBe('declarations');
					expect(context.family).toMatchObject([{ key: '.button' }]);

					return context.sort(items, { by: 'name' });
				}) satisfies OrderSorter,
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Keeps semantic owners for flat families and compatible selector lists',
		code: `
			.card__title {}
			.card__icon {}
			.button:focus, .button:hover { display: block; color: red; }
		`,
		fixed: `
			.card__icon {}
			.card__title {}
			.button:focus, .button:hover { color: red; display: block; }
		`,
		warnings: [
			{ message: messages.expectedBefore('color', 'display') },
			{ message: messages.expectedBefore('.card__icon', '.card__title') },
		],
	}],
});

testRule({
	description: 'Custom media sorting with typed presets',
	config: [true, {
		order: ['group:responsive', '*'],
		groups: {
			responsive: {
				order: [
					{ type: 'at-rule', name: 'media' },
				],
				sort: ((items, context) => {
					expect(Object.isFrozen(context)).toBe(true);
					expect(Object.isFrozen(context.container)).toBe(true);
					expect(Object.isFrozen(context.family)).toBe(true);

					expect(Object.isFrozen(context.family[0])).toBe(true);
					expect(Object.isFrozen(context.family[1])).toBe(true);

					expect(context).toMatchObject({
						container: { type: 'rule', selector: '.card__title' }, category: 'at-rules', group: 'responsive',
						family: [{ key: '.card' }, { key: '.card__title' }],
					});

					const ratios = items.filter((item) => item.parameter?.includes('aspect-ratio'));
					const dimensions = items.filter((item) => !ratios.includes(item));
					const sorted = context.sort(dimensions, { by: 'dimension', units: ['rem'] });

					expectTypeOf(sorted).toEqualTypeOf<readonly OrderSortItem[]>();

					return [...sorted, ...ratios.toSorted((a, b) => aspectRatio(a) - aspectRatio(b))];
				}) satisfies OrderSorter,
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Combines numeric dimensions and aspect ratios while exposing frozen owner metadata',
		code: `
			.card__title {
				@media (min-aspect-ratio: 16/9) {}
				@media (min-width: 60rem) {}
				@media (min-aspect-ratio: 4/3) {}
				@media (min-width: 20rem) {}
			}
		`,
		fixed: `
			.card__title {
				@media (min-width: 20rem) {}
				@media (min-width: 60rem) {}
				@media (min-aspect-ratio: 4/3) {}
				@media (min-aspect-ratio: 16/9) {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (min-width: 20rem)', '@media (min-width: 60rem)') },
			{ message: messages.expectedAfter('@media (min-aspect-ratio: 16/9)', '@media (min-aspect-ratio: 4/3)') },
		],
	}],
});
