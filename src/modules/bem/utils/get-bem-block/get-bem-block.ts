import { parseSelectors } from '#modules/selectors';
import type { AtRule, Root, Rule } from 'postcss';

type BemBlock = {
	rule: Rule;
	blockName: string;
	selector: string;
};

/**
 * Retrieves the first valid BEM block definition from the PostCSS tree.
 *
 * By convention, a BEM block is determined as:
 * * A `Rule` with a single selector.
 * * Selector's last part is a class (e.g., `.the-component`).
 * * Rule is not nested inside any at-rule other than `@layer` or `@media`.
 * * Selectors like `html .the-component` are allowed; only the last part matters.
 *
 * @param   root   PostCSS `Root` object.
 *
 * @returns        The first BEM block definition if found, otherwise `null`.
 */
export const getBemBlock = (root: Root): BemBlock | null => {
	let result: BemBlock | null = null;

	root.walkRules((rule) => {
		// PostCSS does not provide a way to break `walkRules`,
		// so we rely on early return.
		if (result) return;

		// Skip rules with multiple selectors (e.g., `.the-component, .foo`) -
		// definitely not what we're looking for.
		if (rule.selectors.length > 1) return;

		// Skip rules inside disallowed at-rules
		if (
			rule.parent?.type === 'atrule'
			&& (rule.parent as AtRule).name !== 'layer'
			&& (rule.parent as AtRule).name !== 'media'
		) return;

		const lastSelector = parseSelectors(rule.selector)[0]?.at(-1)!.toString();

		// Only class selectors allowed
		if (!lastSelector.startsWith('.')) return;

		// Do not validate while writing the selector.
		if (lastSelector.length === 1) return;

		result = {
			rule,
			blockName: lastSelector.slice(1),
			selector: lastSelector,
		};
	});

	return result;
};
