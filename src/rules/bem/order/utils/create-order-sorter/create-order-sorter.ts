import { isEmpty, isFiniteNumber, isFunction, isUndefined } from '@morev/utils';
import valueParser from 'postcss-value-parser';
import { normalizeProperty } from '../normalize-property/normalize-property';
import { preservePropertyOrder } from '../preserve-property-order/preserve-property-order';
import type { PreparedOrderSorter } from '../../order.internal-types';
import type { OrderSort, OrderSortItem } from '../../order.types';

/**
 * Extracts a single literal numeric dimension without evaluating queries or expressions.
 *
 * @param   item   Description whose parameters or declaration value may contain a dimension.
 *
 * @returns        The literal dimension, or undefined for an ambiguous or computed value.
 */
const resolveDimension = (item: OrderSortItem) => {
	const value = item.parameter ?? item.value;
	if (isUndefined(value) || /\$|#\{/u.test(value)) return undefined;

	const parsed = valueParser(value);
	const dimensions: Array<{ value: number; unit: string }> = [];
	let isAmbiguous = false;
	const isInclude = (item.category === 'at-rules' && item.name === 'include')
		|| item.category === 'sass:includes'
		|| item.category === 'sass:include-statements'
		|| item.category === 'sass:include-blocks';
	const call = isInclude
		? parsed.nodes.find((node) => node.type !== 'space' && node.type !== 'comment')
		: undefined;

	parsed.walk((node) => {
		if (node.type === 'function') {
			// Parentheses group query features; only a direct mixin invocation is a transparent named call.
			if (node.unclosed || (node.value && node !== call)) {
				isAmbiguous = true;
				return false;
			}
		} else if (node.type === 'div' && [',', '/'].includes(node.value)) {
			isAmbiguous = true;
		} else if (node.type === 'word') {
			if (/^(?:or|not|--[\w-]+)$/iu.test(node.value)
				|| ['+', '-', '*', '/'].includes(node.value)) isAmbiguous = true;

			for (const part of node.value.split(/[<=>]+/u)) {
				const dimension = valueParser.unit(part);
				if (!dimension) continue;

				const numeric = Number(dimension.number);
				if (!isFiniteNumber(numeric)) isAmbiguous = true;
				dimensions.push({ value: numeric, unit: dimension.unit.toLowerCase() });
			}
		}

		return undefined;
	});

	return !isAmbiguous && dimensions.length === 1 ? dimensions[0] : undefined;
};

/**
 * Compiles public sorting options while retaining the callback identity contract.
 *
 * @param   option   A built-in preset or a custom sibling permutation.
 *
 * @returns          Executable sorter and any values excluded from its comparisons.
 */
export const createOrderSorter = (option: OrderSort): PreparedOrderSorter => {
	if (isFunction(option)) return { run: option };

	const direction = option.direction === 'desc' ? -1 : 1;
	if (option.by === 'name') {
		/**
		 * Selects a comparison name while normalizing declaration aliases and prefixes.
		 *
		 * @param   item   Immutable description supplied to the sorter.
		 *
		 * @returns        Name used by the name sorting preset.
		 */
		const name = (item: OrderSortItem) => (item.type === 'declaration' ? normalizeProperty(item.name) : item.name);

		return { run: (items) => preservePropertyOrder(items, items.toSorted((a, b) => {
			const first = name(a);
			const second = name(b);
			return (first === second ? 0 : first < second ? -1 : 1) * direction;
		}), (item) => (item.type === 'declaration' ? item.name : undefined)) };
	}

	const units = option.units?.length ? option.units : ['*'];
	const unitRanks = new Map(units.map((unit, rank) => [unit.toLowerCase(), rank]));
	const wildcardRank = unitRanks.get('*');

	/**
	 * Explicit units take precedence over the wildcard regardless of its position.
	 *
	 * @param   item   Description whose parameters or value may contain a dimension.
	 *
	 * @returns        Dimension with its unit priority, or undefined for an unresolved value.
	 */
	const resolve = (item: OrderSortItem) => {
		const dimension = resolveDimension(item);
		if (!dimension || isEmpty(dimension.unit)) return undefined;
		const rank = unitRanks.get(dimension.unit) ?? wildcardRank;
		return isUndefined(rank) ? undefined : { ...dimension, rank };
	};

	const unresolved = option.unresolved ?? 'ignore';

	return {
		isIgnored: unresolved === 'ignore' ? (item) => isUndefined(resolve(item)) : undefined,
		/**
		 * Orders literal dimensions by value within fixed unit slots or explicit unit priorities.
		 * Declaration dependencies take precedence over numeric ordering.
		 *
		 * @param   items   Original sibling descriptions, including unresolved values.
		 *
		 * @returns         Sorted descriptions, or the original order if cascade constraints displace a reserved slot.
		 */
		run: (items) => {
			const rows = items.map((item) => ({ item, dimension: resolve(item) }));
			const known = rows.filter((row) => !isUndefined(row.dimension));
			const unknown = rows.filter((row) => isUndefined(row.dimension)).map(({ item }) => item);

			const groups = new Map<string, typeof known>();
			for (const row of known) {
				const { unit } = row.dimension!;
				const group = groups.get(unit) ?? [];
				group.push(row);
				groups.set(unit, group);
			}

			const ordered = new Map([...groups].map(([unit, group]) => [unit, group.toSorted((a, b) => {
				return (a.dimension!.value - b.dimension!.value) * direction;
			}).values()]));
			// A stable rank sort keeps different wildcard units in their relative slots.
			const slots = unitRanks.size > 1 ? known.toSorted((a, b) => a.dimension!.rank - b.dimension!.rank) : known;
			const resolvedItems = slots.map(({ dimension }) => ordered.get(dimension!.unit)!.next().value!.item);

			let index = 0;
			const preferred = unresolved === 'top'
				? [...unknown, ...resolvedItems]
				: unresolved === 'bottom'
					? [...resolvedItems, ...unknown]
					: rows.map(({ item, dimension }) => (isUndefined(dimension) ? item : resolvedItems[index++]));

			const sorted = preservePropertyOrder(items, preferred, (item) => (item.type === 'declaration' ? item.name : undefined));
			if (unresolved === 'ignore' && rows.some(({ item, dimension }, position) => {
				return isUndefined(dimension) && sorted[position] !== item;
			})) {
				return [...items];
			}

			// Cascade constraints must not make another unit occupy a reserved numeric slot.
			if (!isUndefined(wildcardRank) && preferred.some((item, position) => {
				if (sorted[position] === item) return false;
				const dimension = resolve(item);
				return dimension?.rank === wildcardRank && resolve(sorted[position])?.unit !== dimension.unit;
			})) return [...items];

			return sorted;
		},
	};
};
