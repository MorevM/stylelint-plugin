import { isString, isUndefined } from '@morev/utils';
import { isComment } from '#modules/postcss';
import { getOrderHeader } from '../get-order-header/get-order-header';
import type { ChildNode, Container } from 'postcss';
import type { OrderItem, OrderScopes, PreparedOrderSpacing } from '../../order.internal-types';
import type { BlankLineCondition, BlankLineItemScope, BlankLinePolicy } from '../../order.types';

/**
 * A consecutive run of members at one semantic level.
 */
type SpacingGroup = {
	/**
	 * Index of the first member in the final region.
	 */
	start: number;

	/**
	 * Index after the last member in the final region.
	 */
	end: number;

	/**
	 * Formatting selected for the run.
	 */
	policy: PreparedOrderSpacing;

	/**
	 * Adjacent run before this group at the same semantic level.
	 */
	previous?: SpacingGroup;

	/**
	 * Adjacent run after this group at the same semantic level.
	 */
	next?: SpacingGroup;
};

/**
 * Groups sharing one physical whitespace slot.
 */
type SpacingBoundary = {
	/**
	 * Group ending before the slot.
	 */
	left?: SpacingGroup;

	/**
	 * Group starting after the slot.
	 */
	right?: SpacingGroup;
};

/**
 * Consecutive members use the run's between policy. At its edges, before takes priority over after.
 *
 * @param   boundary   Runs on either side of a whitespace slot.
 *
 * @returns            The policy and the side that owns it, if configured.
 */
const getBoundaryPolicy = (boundary?: SpacingBoundary) => {
	if (!boundary) return undefined;
	const { left, right } = boundary;
	const useFollowingPolicy = left === right || !isUndefined(right?.policy.blankLines?.before);
	const group = useFollowingPolicy ? right : left;
	const policy = left === right
		? group?.policy.blankLines?.between
		: useFollowingPolicy ? group?.policy.blankLines?.before : group?.policy.blankLines?.after;

	return group && !isUndefined(policy) ? { group, policy, useFollowingPolicy } : undefined;
};

/**
 * Checks whether leading comments occupy a line between surrounding code in the final order.
 *
 * @param   item           Member following the boundary, if any.
 * @param   hasLineBreak   Whether the final slot starts on a new line.
 *
 * @returns                Whether a whole comment separates the surrounding code.
 */
const hasSeparatingComment = (item: OrderItem | undefined, hasLineBreak: boolean) => {
	if (!item) return false;

	let hasLineBreakBefore = hasLineBreak;
	for (const [index, node] of item.nodes.entries()) {
		if (node.type !== 'comment') break;
		if (!item.nodes[index + 1].raws.before?.includes('\n')) continue;
		if (hasLineBreakBefore) return true;

		hasLineBreakBefore = true;
	}

	return false;
};

/**
 * One whitespace-only edit, applied after source nodes have reached their target slots.
 */
export type OrderSpacingEdit = {
	/**
	 * First node of the unit, or the container for its closing whitespace.
	 */
	node: ChildNode | Container;

	/**
	 * PostCSS whitespace slot receiving the replacement.
	 */
	field: 'before' | 'after';

	/**
	 * Replacement retaining indentation and newline style.
	 */
	value: string;

	/**
	 * Authored node receiving the diagnostic.
	 */
	reportNode: ChildNode;

	/**
	 * Diagnostic for the side of the group or the separating comment being formatted.
	 */
	message: 'expectedEmptyLineBefore' | 'unexpectedEmptyLineBefore'
		| 'expectedEmptyLineAfter' | 'unexpectedEmptyLineAfter' | 'expectedCommentOnOwnLine';

	/**
	 * Whether this edit can expand a single-line container.
	 */
	addsLineBreak: boolean;

	/**
	 * Configured group name or the member's header.
	 */
	header: string;
};

/**
 * Plans group spacing without changing comment attachment or crossing region boundaries.
 * Each physical boundary has one owner, even when several semantic scopes meet there.
 *
 * @param   original       Source items before moves.
 * @param   sorted         Final item sequence.
 * @param   container      Authored container used for conditions and closing whitespace.
 * @param   scopes         Group projections from each semantic level.
 * @param   isSingleLine   Whether the block remains on one line after the planned whitespace edits.
 *
 * @returns                Independent whitespace edits in final source order.
 */
export const createOrderSpacing = (
	original: OrderItem[],
	sorted: OrderItem[],
	container: Container,
	scopes: OrderScopes['spacing'],
	isSingleLine: boolean,
): OrderSpacingEdit[] => {
	if (!sorted.length) return [];

	const first = sorted[0].nodes[0];
	const originalFirst = original[0].nodes[0];
	const originalLast = original.at(-1)!.nodes.at(-1);
	const isContainerStart = container.nodes?.[0] === originalFirst;
	const isContainerEnd = container.nodes?.at(-1) === originalLast;
	const positions = new Map(sorted.map((item, index) => [item, index]));
	const boundaries = new Map<number, SpacingBoundary>();
	const categoryBoundaries = new Map<number, SpacingBoundary>();
	const edits: OrderSpacingEdit[] = [];
	let containerItemCount: number | undefined;

	// Outer scopes own gaps between families; descendants can only claim gaps inside a family.
	for (const { depth, units } of [...scopes].sort((a, b) => a.depth - b.depth)) {
		// Category runs can span several property groups or inner ranks at this same semantic depth.
		const collectBoundaries = (source: 'policy' | 'categorySpacing', target: Map<number, SpacingBoundary>) => {
			let group: SpacingGroup | undefined;
			for (const unit of units) {
				const start = positions.get(unit.items[0])!;
				const end = positions.get(unit.items.at(-1)!)! + 1;
				const previous = group?.end === start ? group : undefined;
				const policy = unit[source] ?? { key: unit.policy.key };

				if (previous?.policy.key === policy.key) {
					previous.end = end;
					group = previous;
				} else {
					group = { start, end, policy, previous };
					if (previous) previous.next = group;
				}

				if (previous && !boundaries.has(start)) target.set(start, { left: previous, right: group });
				if (depth === 0 && start === 0 && isContainerStart) target.set(0, { right: group });
			}

			if (depth === 0 && group && isContainerEnd) target.set(sorted.length, { left: group });
		};

		if (units.some((unit) => unit.categorySpacing)) {
			collectBoundaries('categorySpacing', categoryBoundaries);
		}
		collectBoundaries('policy', boundaries);
	}

	const countItems = (scope: BlankLineItemScope, group: SpacingGroup) => {
		if (scope === 'container') {
			containerItemCount ??= container.nodes?.filter((node) => !isComment(node)).length ?? 0;
			return containerItemCount;
		}

		const target = scope === 'previous-group' ? group.previous : scope === 'next-group' ? group.next : group;
		return target ? target.end - target.start : undefined;
	};

	const resolvePolicy = (
		policy: BlankLinePolicy, group: SpacingGroup, position: number, isSeparatedByComment: boolean,
	) => {
		if (isString(policy)) return policy;

		const doesConditionMatch = (condition: BlankLineCondition): boolean => {
			if (!isString(condition)) {
				if ('all' in condition) return condition.all.every((entry) => doesConditionMatch(entry));
				if ('any' in condition) return condition.any.some((entry) => doesConditionMatch(entry));
				if ('not' in condition) return !doesConditionMatch(condition.not);

				const count = countItems(condition.scope ?? 'group', group);
				if (isUndefined(count)) return false;

				return 'minItems' in condition ? count >= condition.minItems : count <= condition.maxItems;
			}

			if (condition === 'first-nested') return container.type !== 'root' && isContainerStart && position === 0;
			if (condition === 'last-nested') {
				return container.type !== 'root' && isContainerEnd && position === sorted.length - 1;
			}
			if (condition === 'separated-by-comment') return isSeparatedByComment;

			return isSingleLine;
		};

		const rule = policy.rules.find(({ when }) => doesConditionMatch(when));

		return rule?.mode ?? policy.default ?? 'ignore';
	};

	for (const [position, boundary] of [...boundaries].sort(([a], [b]) => a - b)) {
		// File padding is outside group formatting, unlike whitespace inside a nested block.
		if (container.type === 'root' && (position === 0 || position === sorted.length)) continue;

		const isTerminal = position === sorted.length;
		const selected = getBoundaryPolicy(boundary) ?? getBoundaryPolicy(categoryBoundaries.get(position));
		if (!selected || selected.policy === 'ignore') continue;
		const { policy, group, useFollowingPolicy } = selected;

		const itemPosition = useFollowingPolicy ? position : position - 1;
		const item = sorted[itemPosition];
		const following = sorted[position];
		const node = isTerminal ? container : following.nodes[0];
		const field = isTerminal ? 'after' : 'before';
		const whitespace = isTerminal
			? container.raws.after ?? ''
			: (node === first ? originalFirst : node === originalFirst ? first : node).raws.before ?? '';
		if (!/^\s*$/u.test(whitespace)) continue;

		const hasLineBreak = whitespace.includes('\n');
		const isSeparatedByComment = !isString(policy) && hasSeparatingComment(following, hasLineBreak);
		const mode = resolvePolicy(policy, group, itemPosition, isSeparatedByComment);
		if (mode === 'ignore') continue;

		const hasEmptyLine = mode === 'always';
		if (/\r?\n[\t ]*\r?\n/u.test(whitespace) === hasEmptyLine) continue;

		// A single newline can put a leading comment on its own line and satisfy the policy in one fix.
		const canSeparateComment = hasEmptyLine && !hasLineBreak && !isString(policy)
			&& hasSeparatingComment(following, true) && resolvePolicy(policy, group, itemPosition, true) !== 'always';

		const newline = whitespace.includes('\r\n') || container.source?.input.css.includes('\r\n') ? '\r\n' : '\n';
		const indent = /[\t ]*$/u.exec(whitespace)![0];
		if (canSeparateComment) {
			edits.push({
				node, field, value: newline + indent, reportNode: following.nodes[0],
				message: 'expectedCommentOnOwnLine', addsLineBreak: true,
				header: following.label?.text ?? getOrderHeader(following.node),
			});
			continue;
		}

		const value = hasEmptyLine ? `${newline}${newline}${indent}` : `${hasLineBreak ? newline : ''}${indent}`;
		const message = useFollowingPolicy
			? hasEmptyLine ? 'expectedEmptyLineBefore' : 'unexpectedEmptyLineBefore'
			: hasEmptyLine ? 'expectedEmptyLineAfter' : 'unexpectedEmptyLineAfter';

		edits.push({
			node, field, value, reportNode: item.node, message, addsLineBreak: hasEmptyLine,
			header: group.policy.label ?? item.label?.text ?? getOrderHeader(item.node),
		});
	}

	return edits;
};
