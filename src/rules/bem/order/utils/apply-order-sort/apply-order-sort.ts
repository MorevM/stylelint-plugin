import { isArray, isError, isPromise } from '@morev/utils';
import * as v from 'valibot';
import { vOrderSortPreset } from '../../order.schema';
import { createOrderSorter } from '../create-order-sorter/create-order-sorter';
import { normalizeParameters } from '../normalize-parameters/normalize-parameters';
import type { Family, OrderItem, PreparedOrderSorter } from '../../order.internal-types';
import type { OrderCategory, OrderSortContext, OrderSortItem, OrderSortPreset } from '../../order.types';

/**
 * A custom sorting failure that invalidates the stylesheet plan before any fixes are applied.
 */
class OrderSortError extends Error {}

/**
 * Internal ordering unit whose authored nodes stay private to the rule.
 */
type SortUnit = {
	/**
	 * Representative authored node, normally the base of a semantic family.
	 */
	item: OrderItem;

	/**
	 * Semantic family metadata when this unit owns several authored nodes.
	 */
	family?: Family;

	/**
	 * Original sibling position before either rank ordering or custom sorting.
	 */
	sourceIndex: number;
};

/**
 * Applies one custom sorter to immutable descriptions and validates an exact identity permutation.
 *
 * @param        units         Equal-rank units in original sibling order.
 * @param        sort          Prepared preset or user-provided synchronous sorting callback.
 * @param        category      Category shared by these units.
 * @param        scope         Configuration path used to identify an invalid callback.
 * @param        environment   Authored container and semantic owner path.
 *
 * @returns                    Sorted units and the subset managed by this comparison.
 *
 * @throws  {OrderSortError}   If the callback fails or does not return an exact identity permutation.
 */
const applyOrderSort = <T extends SortUnit>(
	units: T[],
	sort: PreparedOrderSorter,
	category: OrderCategory,
	scope: string,
	environment: Pick<OrderSortContext, 'container' | 'family' | 'group'>,
) => {
	const descriptions: readonly OrderSortItem[] = Object.freeze(units.map(({ item, family, sourceIndex }) => {
		const { node } = item;
		const definitionName = item.sassDefinition?.category === category ? item.sassDefinition.name : undefined;

		return Object.freeze({
			type: family ? 'family' : node.type === 'atrule' ? 'at-rule' : node.type === 'decl' ? 'declaration' : 'rule',
			name: family?.name ?? definitionName ?? (node.type === 'atrule'
				? node.name
				: node.type === 'decl' ? node.prop : node.type === 'rule' ? node.selector : node.toString()),
			category,
			sourceIndex,
			key: family?.key,
			selector: node.type === 'rule' ? node.selector : undefined,
			parameter: node.type === 'atrule' ? normalizeParameters(node.params) : undefined,
			value: node.type === 'decl' ? node.value : undefined,
			hasBlock: node.type === 'atrule' ? Boolean(node.nodes) : undefined,
		});
	}));
	const originals = new Map(descriptions.map((description, index) => [description, units[index]]));

	try {
		const context: OrderSortContext = Object.freeze({
			...environment, category,
			/**
			 * Delegates a distinct subset of the current batch to a validated built-in preset.
			 *
			 * @param        items    Original descriptions from this callback's batch.
			 * @param        preset   Built-in sorting policy to apply to the subset.
			 *
			 * @returns               Reordered original descriptions with declaration dependencies preserved.
			 *
			 * @throws  {Error}   If the subset contains duplicates, foreign items or an invalid preset.
			 */
			sort: <Item extends OrderSortItem>(items: readonly Item[], preset: OrderSortPreset): readonly Item[] => {
				if (new Set(items).size !== items.length || items.some((item) => !originals.has(item))) {
					throw new Error('context.sort accepts distinct original items from the current batch');
				}

				const parsed = v.safeParse(vOrderSortPreset, preset);
				if (!parsed.success) throw new Error('context.sort requires a valid built-in sorting preset');

				return createOrderSorter(parsed.output).run(items, context) as readonly Item[];
			},
		});

		const sorted: unknown = sort.run(descriptions, context);
		if (isPromise(sorted)) {
			// An unsupported async callback must not leave an unhandled rejection behind.
			Promise.allSettled([sorted]);
			throw new Error('Return a synchronous array of original items');
		}
		if (!isArray(sorted) || sorted.length !== descriptions.length
			|| new Set(sorted).size !== descriptions.length || ![...sorted].every((item) => originals.has(item))) {
			throw new Error('Return every original item exactly once');
		}

		return {
			sorted: sorted.map((item) => originals.get(item)!),
			compared: sorted.filter((item) => !sort.isIgnored?.(item)).map((item) => originals.get(item)!),
		};
	} catch (error) {
		throw new OrderSortError(`${scope}: ${isError(error) ? error.message : String(error)}`);
	}
};

export { applyOrderSort, OrderSortError };
