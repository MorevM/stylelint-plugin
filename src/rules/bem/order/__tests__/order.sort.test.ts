import { assert, isUndefined, stripIndent } from '@morev/utils';
import stylelint from 'stylelint';
import rule from '../order';
import type { GroupSequence, OrderSorter, SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Custom element sorting',
	config: [true, {
		categories: {
			elements: {
				sort: ((items) => {
					expect(Object.isFrozen(items)).toBe(true);

					const groups = new Map<string, number>();
					const rows = items.map((item) => {
						expect(Object.isFrozen(item)).toBe(true);
						expect(item.type).toBe('family');

						const parts = item.name.split('-');
						const group = parts[0];
						if (!groups.has(group)) groups.set(group, groups.size);
						return { item, group: groups.get(group)!, depth: parts.length };
					});
					return rows.toSorted((a, b) => a.group - b.group || a.depth - b.depth).map(({ item }) => item);
				}) satisfies OrderSorter,
			},
		},
	}],
	reject: [{
		description: 'Groups related names by first appearance independently for each block and retains states',
		code: `
			.card__title {}
			.card__title:hover {}
			.card__element {}
			.card__title-icon {}
			.card__element-icon {}
			.panel__element {}
			.panel__title {}
			.panel__element-icon {}
			.panel__title-icon {}
		`,
		fixed: `
			.card__title {}
			.card__title:hover {}
			.card__title-icon {}
			.card__element {}
			.card__element-icon {}
			.panel__element {}
			.panel__element-icon {}
			.panel__title {}
			.panel__title-icon {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.card__title-icon', '.card__element') },
			{ message: messages.expectedBefore('.panel__element-icon', '.panel__title') },
		],
	}],
});

const sortParameters = ((items) => {
	expect(items.map((item) => item.sourceIndex)).toStrictEqual(
		items.map((item) => item.sourceIndex).toSorted((a, b) => a - b),
	);

	return items.toSorted((a, b) => {
		assert(!isUndefined(a.parameter) && !isUndefined(b.parameter));
		return Number(a.parameter.match(/\d+/u)?.[0]) - Number(b.parameter.match(/\d+/u)?.[0]);
	});
}) satisfies OrderSorter;

testRule({
	description: 'Separate group ranks',
	config: [true, {
		root: { order: ['group:responsive', 'rules'] },
		groups: {
			responsive: {
				order: [
					{ type: 'at-rule', name: 'media' },
					{ type: 'at-rule', name: 'container' },
				] satisfies GroupSequence,
				sort: ((items) => {
					expect(new Set(items.map((item) => item.name)).size).toBe(1);

					return sortParameters(items);
				}) satisfies OrderSorter,
			},
		},
	}],
	reject: [{
		description: 'Sorts each explicit group rank independently using normalized parameters',
		code: `
			@container sidebar (min-width: 80rem) {}
			@media (min-width: 60rem) {}
			@container sidebar (min-width: 40rem) {}
			@media (min-width: 20rem) {}
		`,
		fixed: `
			@media (min-width: 20rem) {}
			@media (min-width: 60rem) {}
			@container sidebar (min-width: 40rem) {}
			@container sidebar (min-width: 80rem) {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (min-width: 20rem)', '@media (min-width: 60rem)') },
			{
				message: messages.expectedAfter(
					'@container sidebar (min-width: 80rem)', '@container sidebar (min-width: 40rem)',
				),
			},
		],
	}],
});

testRule({
	description: 'Equal group ranks',
	config: [true, {
		root: { order: ['group:responsive', 'rules'] },
		groups: {
			responsive: {
				order: [[{ type: 'at-rule', name: 'media' }, { type: 'at-rule', name: 'container' }]],
				sort: sortParameters,
			},
		},
	}],
	reject: [{
		description: 'Mixes at-rule kinds only when their matchers share an explicit rank',
		code: `
			@media (min-width: 20rem) {}
			@media (min-width: 60rem) {}
			@container sidebar (min-width: 40rem) {}
		`,
		fixed: `
			@media (min-width: 20rem) {}
			@container sidebar (min-width: 40rem) {}
			@media (min-width: 60rem) {}
		`,
		warnings: [{
			message: messages.expectedBefore('@container sidebar (min-width: 40rem)', '@media (min-width: 60rem)'),
		}],
	}],
});

testRule({
	description: 'Matcher sorters with equal priorities in a named group',
	config: [true, {
		root: { order: ['group:tags'] },
		groups: {
			tags: {
				order: [
					[
						{ type: 'rule', selector: /^h/u, sort: { by: 'name', direction: 'desc' } },
						{ type: 'rule', selector: /^p/u },
					],
				],
				sort: { by: 'name' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts headings in their own slots and uses the group sorter for the other tags',
		code: 'h1 {} pre {} h2 {} p {}',
		fixed: 'h2 {} p {} h1 {} pre {}',
		warnings: [{ message: messages.expectedGroupBefore('rules "h2", "p"', 'h1') }],
	}],
});

testRule({
	description: 'Matcher sorters with separate priorities in a named group',
	config: [true, {
		root: { order: ['group:tags'] },
		groups: {
			tags: {
				order: [
					{ type: 'rule', selector: /^h/u, sort: { by: 'name', direction: 'desc' } },
					{ type: 'rule', selector: /^p/u },
				],
				sort: { by: 'name' },
			},
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Places descending headings before the other tags in ascending order',
		code: 'h1 {} pre {} h2 {} p {}',
		fixed: 'h2 {} h1 {} p {} pre {}',
		warnings: [
			{ message: messages.expectedBefore('h2', 'h1') },
			{ message: messages.expectedBefore('p', 'pre') },
		],
	}],
});

testRule({
	description: 'Explicit groups and the remaining rules',
	config: [true, {
		root: {
			order: [
				'group:headings',
				'group:text',
				'rules',
			],
		},
		groups: {
			headings: [{ type: 'rule', selector: /^h/u }],
			text: [{ type: 'rule', selector: /^p/u }],
		},
		categories: {
			rules: {
				order: [
					{ type: 'rule', selector: 'nav' },
					{ type: 'rule', sort: { by: 'name', direction: 'desc' } },
				],
				sort: { by: 'name' },
			},
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Preserves source order within each explicit group',
		code: 'h1 {} h2 {} p {} pre {}',
	}],
	reject: [{
		description: 'Applies the category matcher sorter to the remaining rules',
		code: 'h1 {} nav {} article {} section {} p {} h2 {} pre {}',
		fixed: 'h1 {} h2 {} p {} pre {} nav {} section {} article {}',
		warnings: [
			{ message: messages.expectedBefore('h2', 'nav') },
			{ message: messages.expectedBefore('p', 'nav') },
			{ message: messages.expectedBefore('pre', 'nav') },
			{ message: messages.expectedBefore('section', 'article') },
		],
	}],
});

testRule({
	description: 'Custom sorting with ignored members',
	config: [true, {
		categories: {
			'custom-properties': {
				order: [/^--size-/u, '--theme'],
				unspecified: 'ignore',
				sort: ((items) => {
					expect(items.some((item) => item.name === '--free')).toBe(false);

					return items.toSorted((a, b) => a.name.localeCompare(b.name));
				}) satisfies OrderSorter,
			},
		},
	}],
	reject: [{
		description: 'Retains ignored slots and explicit priorities while sorting tied declarations',
		code: `
			.card {
				--size-b: 2;
				--free: 0;
				--theme: red;
				--size-a: 1;
			}
		`,
		fixed: `
			.card {
				--size-a: 1;
				--free: 0;
				--size-b: 2;
				--theme: red;
			}
		`,
		warnings: [{ message: messages.expectedBefore('--size-a', '--theme') }],
	}],
});

testRule({
	description: 'Custom sorting with unspecified members',
	config: [true, {
		categories: {
			'custom-properties': {
				order: [/^--size-/u, '--theme'],
				sort: ((items) => items.toSorted((a, b) => a.name.localeCompare(b.name))) satisfies OrderSorter,
			},
		},
	}],
	reject: [{
		description: 'Sorts matched names and moves unspecified declarations to the bottom in their original order',
		code: `
			.card {
				--size-c: 3;
				// 📌 Unspecified names retain their relative order despite the name sorter.
				--zeta: 9;
				--theme: red;
				--size-b: 2;
				--free: 0;
				--size-a: 1;
				--alpha: 4;
			}
		`,
		fixed: `
			.card {
				--size-a: 1;
				--size-b: 2;
				--size-c: 3;
				--theme: red;
				// 📌 Unspecified names retain their relative order despite the name sorter.
				--zeta: 9;
				--free: 0;
				--alpha: 4;
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('--size-a', '--size-c') },
			{ message: messages.expectedBefore('--size-b', '--size-c') },
			{ message: messages.expectedBefore('--theme', '--zeta') },
		],
	}],
});

testRule({
	description: 'Custom sorting with an explicit remainder',
	config: [true, {
		categories: {
			'custom-properties': {
				order: [/^--size-/u, '--theme', '*'],
				sort: ((items) => items.toSorted((a, b) => a.name.localeCompare(b.name))) satisfies OrderSorter,
			},
		},
	}],
	reject: [{
		description: 'Sorts the explicit remainder independently after higher-priority declarations',
		code: `
			.card {
				--size-c: 3;
				--zeta: 9;
				--theme: red;
				--size-b: 2;
				--free: 0;
				--size-a: 1;
				// 📌 The explicit remainder also sorts names unmatched by earlier entries.
				--alpha: 4;
			}
		`,
		fixed: `
			.card {
				--size-a: 1;
				--size-b: 2;
				--size-c: 3;
				--theme: red;
				// 📌 The explicit remainder also sorts names unmatched by earlier entries.
				--alpha: 4;
				--free: 0;
				--zeta: 9;
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('--size-a', '--size-c') },
			{ message: messages.expectedBefore('--size-b', '--size-c') },
			{ message: messages.expectedBefore('--alpha', '--free') },
			{ message: messages.expectedAfter('--zeta', '--free') },
		],
	}],
});

describe('Custom sorter validation', () => {
	it('Rejects an invalid later permutation without applying earlier fixes', async () => {
		const code = stripIndent(`
			.card {
				&:active {}
				&:hover {}
			}
			.button__title {}
			.button__icon {}
		`);
		// The rule-testing helper rejects invalid-option warnings before checking the resulting CSS.
		const result = await stylelint.lint({
			code,
			fix: true,
			customSyntax: 'postcss-scss',
			config: {
				plugins: [stylelint.createPlugin(ruleName, rule)],
				rules: {
					[ruleName]: [true, {
						categories: { elements: { sort: ((items) => [items[0], items[0]]) satisfies OrderSorter } },
					}],
				},
			},
		});

		expect(result.code).toBe(code);
		expect(result.results[0].warnings).toStrictEqual([]);
		expect(result.results[0].invalidOptionWarnings).toHaveLength(1);
		expect(result.results[0].invalidOptionWarnings[0].text).toContain(
			'categories.elements.sort: Return every original item exactly once',
		);
	});
});
