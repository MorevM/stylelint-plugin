import type { Declaration, Rule } from 'postcss';

type Options = {
	onlyDirectChildren: boolean;
};

const DEFAULTS = {
	onlyDirectChildren: false,
};

export const getRuleDeclarations = (
	rule: Rule,
	userOptions?: Partial<Options>,
): Declaration[] => {
	const declarations: Declaration[] = [];
	const options = { ...DEFAULTS, ...userOptions };

	if (!options.onlyDirectChildren) {
		// `.walkDecls()` traverses all the declarations.
		rule.walkDecls((declaration) => { declarations.push(declaration); });
		return declarations;
	}

	// `.each()` traverses only direct children.
	rule.each((node) => {
		if (node.type !== 'decl') return;
		declarations.push(node);
	});

	return declarations;
};
