import { isUndefined } from '@morev/utils';
import { isAtRule } from '#modules/postcss';
import type { ChildNode } from 'postcss';

/**
 * Creates a cached content-insertion lookup for one stylesheet analysis.
 * Keep the cache local to the rule run, before any AST moves are applied.
 *
 * @returns   A predicate detecting content insertion outside nested definitions.
 */
export const createContentInsertionChecker = () => {
	const insertionBoundaries = new WeakMap<ChildNode, boolean>();

	/**
	 * Detects content insertion in a subtree without entering nested definitions.
	 *
	 * @param   node   Subtree to inspect before any AST moves.
	 *
	 * @returns        Cached insertion status for this stylesheet analysis.
	 */
	const hasContentInsertion = (node: ChildNode): boolean => {
		const cached = insertionBoundaries.get(node);
		if (!isUndefined(cached)) return cached;
		// A definition does not execute its content insertion in the enclosing container.
		if (isAtRule(node, ['function', 'mixin'], { ignoreCase: true })) return false;

		const hasInsertion = isAtRule(node, ['content', 'contents'], { ignoreCase: true })
			|| ('nodes' in node && (node.nodes ?? []).some((child) => hasContentInsertion(child)));
		insertionBoundaries.set(node, hasInsertion);

		return hasInsertion;
	};

	return hasContentInsertion;
};
