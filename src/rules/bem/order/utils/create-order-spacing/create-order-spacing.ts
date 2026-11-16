import { isUndefined } from '@morev/utils';
import { isDeclaration } from '#modules/postcss';
import { getOrderHeader } from '../get-order-header/get-order-header';
import type { ChildNode, Container } from 'postcss';
import type { OrderItem, OrderScopes } from '../../order.internal-types';

/**
 * One whitespace-only edit, applied after source nodes have reached their target slots.
 */
export type OrderSpacingEdit = {
	/**
	 * First node of the unit, including an attached leading comment.
	 */
	node: ChildNode;

	/**
	 * Authored node receiving the diagnostic.
	 */
	reportNode: ChildNode;

	/**
	 * Replacement for raws.before, retaining indentation and newline style.
	 */
	before: string;

	/**
	 * Whether an empty line is required rather than forbidden.
	 */
	hasEmptyLine: boolean;

	/**
	 * Configured group name or the first member's header.
	 */
	header: string;
};

/**
 * Plans group spacing without changing comment attachment or crossing region boundaries.
 *
 * @param   original    Source items before moves.
 * @param   sorted      Final item sequence.
 * @param   container   Authored container used for threshold counting.
 * @param   scopes      Group projections from each semantic level.
 *
 * @returns             Independent whitespace edits in final source order.
 */
export const createOrderSpacing = (
	original: OrderItem[],
	sorted: OrderItem[],
	container: Container,
	scopes: OrderScopes['spacing'],
): OrderSpacingEdit[] => {
	if (!sorted.length) return [];

	const first = sorted[0].nodes[0];
	const originalFirst = original[0].nodes[0];
	const count = container.nodes?.filter((node) => isDeclaration(node) && !/^(?:--|\$)/u.test(node.prop)).length ?? 0;
	const positions = new Map(sorted.map((item, index) => [item, index]));
	const edits = new Map<ChildNode, OrderSpacingEdit>();
	const rows = scopes.flatMap((units) => units.map((unit, index) => ({ unit, previous: units[index - 1] })));

	for (const { unit, previous } of rows) {
		const { policy } = unit;
		if (!policy || !unit.items.length) continue;

		const item = unit.items[0];
		const node = item.nodes[0];
		const position = positions.get(item)!;
		const isFirst = position === 0 && container.nodes?.[0] === originalFirst;
		if (position === 0 && !isFirst) continue;

		const isSameGroup = previous?.policy?.key === policy.key
			&& positions.get(previous.items.at(-1)!)! + 1 === position;
		let hasEmptyLine: boolean | undefined;
		if (isSameGroup) {
			if (policy.noEmptyLineBetween) hasEmptyLine = false;
		} else if (policy.emptyLineBefore !== undefined) {
			hasEmptyLine = !isFirst && (policy.emptyLineBefore === 'always'
				|| (policy.emptyLineBefore === 'threshold' && count >= policy.threshold));
		}
		if (isUndefined(hasEmptyLine)) continue;

		const before = (node === first ? originalFirst : node === originalFirst ? first : node).raws.before ?? '';
		if (!/^\s*$/u.test(before)) continue;

		const hasExistingEmptyLine = /\r?\n[\t ]*\r?\n/u.test(before);
		if (hasExistingEmptyLine === hasEmptyLine) continue;

		const newline = before.includes('\r\n') ? '\r\n' : '\n';
		const indent = /[\t ]*$/u.exec(before)![0];
		const replacement = hasEmptyLine
			? `${newline}${newline}${indent}`
			: isFirst && container.type === 'root' ? indent : `${before.includes('\n') ? newline : ''}${indent}`;
		edits.set(node, {
			node, reportNode: item.node, before: replacement, hasEmptyLine,
			header: policy.groupName ?? getOrderHeader(item.node),
		});
	}

	return [...edits.values()];
};
