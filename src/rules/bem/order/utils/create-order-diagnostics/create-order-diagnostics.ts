import { assert } from '@morev/utils';
import { getOrderHeader } from '../get-order-header/get-order-header';
import type { OrderItem } from '../../order.internal-types';
import type { createOrderMoves } from '../create-order-moves/create-order-moves';

const MAX_LABEL_LENGTH = 80;

/**
 * Finds labels requiring extra detail to distinguish authored nodes in diagnostics.
 *
 * @param   labels   Candidate diagnostic labels in source order.
 *
 * @returns          Labels occurring more than once.
 */
const findDuplicateLabels = (labels: Iterable<string>) => {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const label of labels) {
		if (seen.has(label)) duplicates.add(label);
		seen.add(label);
	}

	return duplicates;
};

/**
 * Describes each moved run relative to a retained node it actually crosses.
 * Labels distinguish repeated authored nodes without changing their source ranges.
 *
 * @param   items    Original uninterrupted region.
 * @param   sorted   Stable target sequence.
 * @param   moves    Minimal relocation plan, left unchanged.
 *
 * @returns          Source diagnostics, captured before any fix changes the tree.
 */
export const createOrderDiagnostics = (
	items: OrderItem[],
	sorted: OrderItem[],
	moves: ReturnType<typeof createOrderMoves>,
) => {
	const headers = new Map(items.map((item) => [item, getOrderHeader(item.node)]));
	const duplicateHeaders = findDuplicateLabels(headers.values());
	const labels = new Map(items.map((item) => {
		const header = headers.get(item)!;
		const { node } = item;
		const full = item.label ?? (node.type === 'decl' && duplicateHeaders.has(header)
			? `${header}: ${node.value}${node.important ? ' !important' : ''}`
			: header);
		const compact = full.replaceAll(/\s+/gu, ' ').trim();

		return [item, compact.length > MAX_LABEL_LENGTH ? `${compact.slice(0, MAX_LABEL_LENGTH - 1)}…` : compact];
	}));

	const duplicateLabels = findDuplicateLabels(labels.values());
	for (const [index, item] of items.entries()) {
		const label = labels.get(item)!;
		if (!duplicateLabels.has(label)) continue;

		const start = item.node.source?.start;
		const location = start ? `line ${start.line}, column ${start.column}` : `item ${index + 1}`;
		labels.set(item, `${label} (${location})`);
	}

	const sourceIndexes = new Map(items.map((item, index) => [item, index]));
	const moved = new Set(moves.flatMap((move) => move.items));
	const previous = new Map<OrderItem, OrderItem>();
	const next = new Map<OrderItem, OrderItem>();
	let retained: OrderItem | undefined;
	for (const item of sorted) {
		if (!moved.has(item)) retained = item;
		else if (retained) previous.set(item, retained);
	}

	retained = undefined;
	for (const item of sorted.toReversed()) {
		if (!moved.has(item)) retained = item;
		else if (retained) next.set(item, retained);
	}

	return moves.map((move) => {
		const item = move.items[0];
		const predecessor = previous.get(item);
		const isAfter = predecessor !== undefined && sourceIndexes.get(predecessor)! > sourceIndexes.get(item)!;
		const anchor = isAfter ? predecessor : next.get(item);
		// Without a crossed retained node, this run could also have been retained.
		assert(anchor !== undefined && (isAfter || sourceIndexes.get(anchor)! < sourceIndexes.get(item)!));

		return {
			node: item.node,
			header: labels.get(item)!,
			anchor: labels.get(anchor)!,
			message: isAfter ? 'expectedAfter' as const : 'expected' as const,
			endIndex: headers.get(item)!.length,
		};
	});
};
