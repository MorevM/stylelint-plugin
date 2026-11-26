import { deepEqual, isArray, isString } from '@morev/utils';
import parser from 'postcss-selector-parser';
import { findOrderRank, isCategoryMatch } from '../create-order-config/create-order-config';
import { resolveOrderSelector } from '../resolve-order-selector/resolve-order-selector';
import type { Rule } from 'postcss';
import type { Separators } from '#modules/shared';
import type { OrderItem } from '../../order.internal-types';
import type { CategorySequence, OrderCategory, SelectorListOrder } from '../../order.types';
import type { createOrderConfig } from '../create-order-config/create-order-config';

/**
 * Orders complete authored branches without rewriting compound or functional selectors.
 * Whitespace belongs to list slots; comments and duplicate branches travel with their branch.
 *
 * @param   node           Original rule retaining its lexical nesting context.
 * @param   options        Opt-in branch priorities and tie breaking.
 * @param   config         Shared category priorities used by inherited ordering.
 * @param   separators     Configured BEM separators.
 * @param   knownTargets   Unambiguous BEM subjects elsewhere in the stylesheet.
 *
 * @returns                Reordered source and its diagnostic text when branches move.
 */
export const sortSelectorList = (
	node: Rule,
	options: SelectorListOrder,
	config: ReturnType<typeof createOrderConfig>,
	separators: Separators,
	knownTargets: Set<string>,
) => {
	if (node.selector.includes('#{')) return undefined;

	const original = node.raws.selector?.value === node.selector ? node.raws.selector.raw : node.selector;
	const parsed = parser().astSync(original);
	if (parsed.nodes.length < 2) return undefined;

	const branches = parsed.nodes.map((branch) => {
		const raw = branch.toString();
		const clean = branch.clone();
		clean.walkComments((comment) => { comment.remove(); });
		const text = raw.trim();
		const name = parser().processSync(clean.toString(), { lossless: false });
		const selector = resolveOrderSelector(node, separators, knownTargets, name);
		const item: OrderItem = { node: node.clone({ selector: name }), nodes: [node], selector: selector ?? undefined };

		return { text, name, item, selector, before: /^\s*/u.exec(raw)![0], after: /\s*$/u.exec(raw)![0] };
	});

	const shouldInherit = options.order === 'inherit'
		|| (options.order === undefined && options.sort === undefined);
	let order: CategorySequence = options.order && options.order !== 'inherit' ? options.order : ['*'];
	let category: OrderCategory | undefined;

	if (shouldInherit) {
		const first = branches[0].selector;
		if (!first?.path.length || first.isList) return undefined;
		category = config.getRank(branches[0].item).category;
		const categories = config.getSelectorCategories(first);
		if (branches.some(({ selector, item }) => {
			if (!selector || selector.isList || !deepEqual(selector.path, first.path)) return true;
			if (category === 'qualifiers') return config.getRank(item).category !== category;
			return !deepEqual(config.getSelectorCategories(selector), categories);
		})) {
			return undefined;
		}
		order = config.getCategoryOrder(category);
	}

	const ranked = branches.map((branch) => {
		let label: string | undefined;
		const rank = findOrderRank(order, (entry) => {
			const match = (isArray(entry) ? entry : [entry]).find((matcher) => {
				return (isString(matcher) && matcher === branch.name) || isCategoryMatch(matcher, branch.item, category);
			});
			if (match === undefined) return false;
			if (!isString(match) && 'label' in match) label = match.label;
			return true;
		});

		return {
			...branch,
			label,
			rank: rank !== -1
				? rank
				: options.unspecified === 'top'
					? -1
					: options.unspecified === 'bottom' ? order.length : null,
		};
	});

	const ordered = ranked.filter((branch) => branch.rank !== null).toSorted((a, b) => {
		if (a.rank !== b.rank) return a.rank! - b.rank!;
		if (!options.sort) return 0;

		const direction = options.sort.direction === 'desc' ? -1 : 1;
		return (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) * direction;
	});

	let index = 0;
	const sorted = ranked.map((branch) => (branch.rank === null ? branch : ordered[index++]));
	const selector = sorted.map((branch, position) => {
		const { before, after } = ranked[position];
		return `${before}${branch.text}${after}`;
	}).join(',');
	if (selector === original) return undefined;

	const description = sorted.some((branch) => branch.label !== undefined)
		? sorted.map(({ text, label }) => (label === undefined ? text : `${label} (${text})`)).join(', ')
		: selector;
	return { selector, description };
};
