import type { Declaration, Rule } from 'postcss';

type Options = {
	/**
	 * Whether to return only direct child declarations.
	 *
	 * @default false
	 */
	onlyDirectChildren: boolean;
};

/**
 * Collects `postcss.Declaration` nodes from a given `postcss.Rule`.
 *
 * @param   rule      A PostCSS `Rule` node to inspect.
 * @param   options   Optional settings.
 *
 * @returns           An array of `Declaration` nodes matching the given criteria.
 */
export const getRuleDeclarations = (
	rule: Rule,
	options: Partial<Options> = {},
): Declaration[] => {
	const { onlyDirectChildren = false } = options;

	if (!onlyDirectChildren) {
		const declarations: Declaration[] = [];
		// `.walkDecls()` traverses all the declarations.
		rule.walkDecls((decl) => { declarations.push(decl); });
		return declarations;
	}

	return (rule.nodes ?? []).filter((node) => node.type === 'decl');
};
