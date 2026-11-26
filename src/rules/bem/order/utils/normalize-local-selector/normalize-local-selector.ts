import selectorParser from 'postcss-selector-parser';
import { isPseudoElementNode } from '#modules/postcss';

/**
 * Builds a comparison key for one local branch without accepting a replacement BEM subject.
 * Conditions commute within each compound; pseudo-elements separate conditions on different subjects.
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

		const parts: string[] = [];
		let conditions: string[] = [];
		for (const node of branch.nodes) {
			if (isPseudoElementNode(node)) {
				parts.push(...conditions.toSorted(), node.toString().replace(/^:+/u, '::'));
				conditions = [];
			} else {
				// Keep repeated conditions for specificity and functional pseudo arguments intact.
				conditions.push(node.toString());
			}
		}

		return [...parts, ...conditions.toSorted()].join('');
	} catch {
		return undefined;
	}
};
