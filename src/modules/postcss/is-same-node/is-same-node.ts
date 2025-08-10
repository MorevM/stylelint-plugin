import type postcss from 'postcss';

/**
 * Returns a stable identifier of the node's input (file path or synthetic id).
 *
 * @param   node   Node for identification.
 *
 * @returns        Source identifier (if any), `null` otherwise.
 */
const getInputId = (node: postcss.Node): string | null =>
	node.source?.input?.file ?? node.source?.input?.id ?? null;

/**
 * Checks if two PostCSS nodes represent the same original source node.
 *
 * @param   a   First node to compare.
 * @param   b   Second node to compare.
 *
 * @returns     `true` if both nodes come from the same input and share identical start/end positions; otherwise `false`.
 */
export const isSameNode = (
	a: postcss.Node | null | undefined,
	b: postcss.Node | null | undefined,
) => {
	if (!a || !b) return false;
	if (a === b) return true;

	// Different kinds of nodes can't be the same source node.
	if (a.type !== b.type) return false;

	const aInput = getInputId(a);
	const bInput = getInputId(b);
	if (!aInput || !bInput || aInput !== bInput) return false;

	const { start: aStart, end: aEnd } = a.source ?? {};
	const { start: bStart, end: bEnd } = b.source ?? {};
	// If either node has no source mapping, we can't assert identity reliably.
	if (!aStart || !aEnd || !bStart || !bEnd) return false;

	return (
		aStart.line === bStart.line
		&& aStart.column === bStart.column
		&& aEnd.line === bEnd.line
		&& aEnd.column === bEnd.column
	);
};
