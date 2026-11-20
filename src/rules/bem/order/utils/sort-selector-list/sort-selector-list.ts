import { deepEqual, isArray, isString } from '@morev/utils';
import parser from 'postcss-selector-parser';
import { isWithinMatch } from '../create-order-config/create-order-config';
import { resolveOrderSelector } from '../resolve-order-selector/resolve-order-selector';
import type { Rule } from 'postcss';
import type { Separators } from '#modules/shared';
import type { OrderItem } from '../../order.internal-types';
import type { SelectorListOrder, WithinSequence } from '../../order.types';
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
 * @returns                Authored selector with only top-level branches permuted.
 */
export const sortSelectorList = (
	node: Rule,
	options: SelectorListOrder,
	config: ReturnType<typeof createOrderConfig>,
	separators: Separators,
	knownTargets: Set<string>,
): string => {
	if (node.selector.includes('#{')) return node.selector;

	const original = node.raws.selector?.value === node.selector ? node.raws.selector.raw : node.selector;
	const parsed = parser().astSync(original);
	if (parsed.nodes.length < 2) return node.selector;

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
	let order: WithinSequence = options.order && options.order !== 'inherit' ? options.order : ['*'];

	if (shouldInherit) {
		const first = branches[0].selector;
		if (!first?.path.length || first.isList) return node.selector;
		if (branches.some(({ selector }) => !selector || selector.isList
			|| !deepEqual(selector.path, first.path) || !deepEqual(selector.categories, first.categories))) {
			return node.selector;
		}
		order = config.getCategoryOrder(config.getRank(branches[0].item).category);
	}

	const ranked = branches.map((branch) => {
		const rank = order.findIndex((entry) => (isArray(entry) ? entry : [entry]).some((matcher) => {
			return (isString(matcher) && matcher === branch.name) || isWithinMatch(matcher, branch.item);
		}));

		return {
			...branch,
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
	const sorted = ranked.map((branch) => {
		const sorted = branch.rank === null ? branch : ordered[index++];
		return `${branch.before}${sorted.text}${branch.after}`;
	}).join(',');

	return sorted === original ? node.selector : sorted;
};
