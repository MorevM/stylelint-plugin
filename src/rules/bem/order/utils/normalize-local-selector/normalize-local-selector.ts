import selectorParser from 'postcss-selector-parser';

/**
 * Normalizes one local compound without accepting a selector list or a replacement BEM subject.
 *
 * @param   value   Local branch such as :hover, :not(.disabled), or [aria-disabled].
 *
 * @returns         Canonical branch text, or undefined for unsupported selector syntax.
 */
export const normalizeLocalSelector = (value: string) => {
	try {
		const parsed = selectorParser().astSync(value, { lossless: false });
		const [branch] = parsed.nodes;
		if (parsed.nodes.length !== 1 || !branch?.nodes.length) return undefined;
		if (branch.nodes.some((node) => !['pseudo', 'class', 'attribute'].includes(node.type))) return undefined;
		return branch.toString();
	} catch {
		return undefined;
	}
};
