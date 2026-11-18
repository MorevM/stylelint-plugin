import { applyOrderSort } from '../apply-order-sort/apply-order-sort';
import type { Family, OrderItem, OrderScopes } from '../../order.internal-types';
import type { OrderSortContext } from '../../order.types';
import type { createOrderConfig } from '../create-order-config/create-order-config';

/**
 * Atomic siblings at one level of the semantic family tree.
 */
type Sibling = {
	/**
	 * Family identity, absent for an authored leaf.
	 */
	family?: Family;

	/**
	 * Original members in first-appearance order.
	 */
	items: OrderItem[];
};

/**
 * Authored and semantic position used while descending the family tree.
 */
type SortEnvironment = Pick<OrderSortContext, 'container' | 'family'> & {
	/**
	 * Selects document ordering before descending into a selector family.
	 */
	isRoot: boolean;

	/**
	 * Number of family ancestors already visited within this authored container.
	 */
	depth: number;
};

/**
 * Sorts families recursively without extracting variants from their owners.
 *
 * @param   items         Movable authored units in one uninterrupted region.
 * @param   getRank       Prepared outer and category-local ordering.
 * @param   environment   Authored container and the full semantic owner path.
 * @param   scopes        Comparisons that exclude units ignored at their own level.
 *
 * @returns               Stable target sequence containing the original units.
 */
export const sortOrderItems = (
	items: OrderItem[],
	getRank: ReturnType<typeof createOrderConfig>['getRank'],
	environment: SortEnvironment,
	scopes?: OrderScopes,
): OrderItem[] => {
	const { isRoot, depth } = environment;
	const siblings: Sibling[] = [];
	const families = new Map<string, Sibling>();

	for (const item of items) {
		const family = item.selector?.path[depth];
		if (!family) {
			siblings.push({ items: [item] });
			continue;
		}
		const key = JSON.stringify([family.category, family.key]);
		const sibling = families.get(key) ?? { family, items: [] };
		if (!families.has(key)) {
			families.set(key, sibling);
			siblings.push(sibling);
		}
		sibling.items.push(item);
	}

	/**
	 * Records changed leaf projections so diagnostics describe only managed comparisons.
	 *
	 * @param   sorted   Target leaf sequence for one comparison.
	 */
	const recordSequence = (sorted: OrderItem[]) => {
		if (!scopes) return;
		const included = new Set(sorted);
		const source = items.filter((item) => included.has(item));
		if (source.some((item, index) => item !== sorted[index])) scopes.sequences.push({ items: source, sorted });
	};

	const original = siblings.map((sibling, sourceIndex) => {
		const base = sibling.items.find((item) => {
			return item.selector?.path.length === depth + 1 && item.selector.categories.includes('base');
		});
		const item = base ?? sibling.items[0];
		const rank = getRank(item, sibling.family, !sibling.family || Boolean(base), isRoot);
		if (rank.label !== undefined) item.label = rank.label;
		return {
			...sibling,
			item,
			sourceIndex,
			rank,
		};
	});

	/**
	 * Stably orders managed siblings by one rank dimension while keeping ignored slots fixed.
	 *
	 * @param   candidates   Siblings participating in this comparison.
	 * @param   dimension    Rank level being applied.
	 *
	 * @returns              Sibling sequence with managed entries reordered and diagnostic scopes recorded.
	 */
	const sortSiblings = (candidates: typeof original, dimension: 'outer' | 'inner' | 'member') => {
		const managed = candidates.filter((sibling) => sibling.rank[dimension] !== null);
		if (scopes && managed.length !== candidates.length) scopes.hasIgnored = true;
		const ordered = managed.toSorted((a, b) => a.rank[dimension]! - b.rank[dimension]!);
		const ranks = new Map(managed.flatMap((sibling) => {
			return sibling.items.map((item) => [item, sibling.rank[dimension]!] as const);
		}));
		// Stable leaf projections explain only this rank comparison, not another level's family order.
		recordSequence(items.filter((item) => ranks.has(item)).toSorted((a, b) => ranks.get(a)! - ranks.get(b)!));
		let index = 0;
		return candidates.map((sibling) => (sibling.rank[dimension] === null ? sibling : ordered[index++]));
	};
	const ranked = sortSiblings(original, 'outer');

	// Category-local priorities cannot displace another category with the same outer rank.
	const positions = new Map<string, number[]>();
	for (const [index, sibling] of ranked.entries()) {
		if (sibling.rank.outer === null) continue;
		const key = JSON.stringify([sibling.rank.outer, sibling.rank.category, sibling.rank.innerScope]);
		const indexes = positions.get(key) ?? [];
		indexes.push(index);
		positions.set(key, indexes);
	}

	for (const indexes of positions.values()) {
		const ordered = sortSiblings(indexes.map((index) => ranked[index]), 'inner');
		for (const [index, position] of indexes.entries()) ranked[position] = ordered[index];
		const memberRanks = new Map<string, number[]>();

		for (const position of indexes) {
			const { inner, memberScope } = ranked[position].rank;
			if (inner !== null) {
				const key = JSON.stringify([inner, memberScope]);
				const memberPositions = memberRanks.get(key) ?? [];
				memberPositions.push(position);
				memberRanks.set(key, memberPositions);
			}
		}
		for (const memberPositions of memberRanks.values()) {
			const members = sortSiblings(memberPositions.map((position) => ranked[position]), 'member');
			for (const [index, position] of memberPositions.entries()) ranked[position] = members[index];
		}

		const batches = new Map<string, number[]>();

		for (const position of indexes) {
			const { rank } = ranked[position];
			if (rank.sort) {
				const key = JSON.stringify([rank.inner, rank.member, rank.sortScope]);
				const batch = batches.get(key) ?? [];
				batch.push(position);
				batches.set(key, batch);
			}
		}

		for (const batch of batches.values()) {
			const units = batch.map((position) => ranked[position]).toSorted((a, b) => a.sourceIndex - b.sourceIndex);
			const { sort, sortScope, category, group } = units[0].rank;
			const context = { container: environment.container, family: environment.family, group };
			const { sorted, compared } = applyOrderSort(units, sort!, category, sortScope!, context);
			if (scopes && compared.length !== sorted.length) scopes.hasIgnored = true;
			recordSequence(compared.flatMap((sibling) => sibling.items));
			for (const [index, position] of batch.entries()) ranked[position] = sorted[index];
		}
	}

	const previousScopeCount = scopes?.spacing.length;
	const projection = ranked.map((sibling) => ({
		items: sibling.family
			? sortOrderItems(sibling.items, getRank, {
				isRoot: false, depth: depth + 1,
				container: environment.container,
				family: Object.freeze([...environment.family, Object.freeze({ ...sibling.family })]),
			}, scopes)
			: sibling.items,
		policy: sibling.rank.spacing,
	}));
	if (scopes && (scopes.spacing.length !== previousScopeCount || projection.some((unit) => unit.policy.blankLines))) {
		scopes.spacing.push({ depth, units: projection });
	}

	return projection.flatMap((unit) => unit.items);
};
