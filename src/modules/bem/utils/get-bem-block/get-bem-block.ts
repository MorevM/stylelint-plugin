import { resolveBemEntities } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities';
import { isAtRule } from '#modules/postcss';
import { parseSelectors } from '#modules/selectors';
import type { Root, Rule } from 'postcss';
import type { Separators } from '#modules/shared';

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
 * @param   root         PostCSS `Root` object.
 * @param   separators   BEM separators used in the current config.
 *
 * @returns              The first BEM block definition if found, otherwise `null`.
 */
export const getBemBlock = (
	root: Root,
	separators: Separators,
): BemBlock | null => {
	let result: BemBlock | null = null;

	root.walkRules((rule) => {
		// PostCSS does not provide a way to break `walkRules`,
		// so we rely on early return.
		if (result) return;

		// Skip rules inside disallowed at-rules.
		if (
			isAtRule(rule.parent)
			&& rule.parent.name !== 'layer'
			&& rule.parent.name !== 'media'
		) return;

		const blockCandidates = rule.selectors.map((selector) => {
			const lastNodeString = parseSelectors(selector)[0]?.at(-1)!.toString();
			// Only class selectors allowed.
			if (!lastNodeString.startsWith('.')) return;
			// Do not validate while writing the selector `.|`.
			if (lastNodeString.length === 1) return;

			return lastNodeString;
		});

		// A scenario like `.foo-component, #bar`
		if (blockCandidates.includes(undefined)) return;

		const allBemEntities = blockCandidates
			.filter(Boolean)
			.map((source) => resolveBemEntities({ source, separators })[0]);

		// `.foo-component, .foo-component--modifier {}`
		const allSame = allBemEntities
			.every((bemEntity) => bemEntity.block.value === allBemEntities[0].block.value);

		if (!allSame) return;

		const bemBlock = allBemEntities[0].block;
		result = {
			rule,
			blockName: bemBlock.value,
			selector: bemBlock.selector,
		};
	});

	return result;
};
