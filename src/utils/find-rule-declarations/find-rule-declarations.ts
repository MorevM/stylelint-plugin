import { isNullish } from '@morev/utils';
import type { Declaration, Rule } from 'postcss';

type Options = {
	filter: string | RegExp | null;
	onlyDirectChildren: boolean;
};

const DEFAULTS = {
	filter: null,
	onlyDirectChildren: false,
};

export const findRuleDeclarations = (
	rule: Rule,
	userOptions?: Partial<Options>,
): Declaration[] => {
	const declarations: Declaration[] = [];
	const options = { ...DEFAULTS, ...userOptions };

	if (isNullish(options.filter)) {
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
	}

	if (!options.onlyDirectChildren) {
		rule.walkDecls(options.filter, (declaration) => { declarations.push(declaration); });
		return declarations;
	}

	rule.each((node) => {
		if (node.type !== 'decl') return;

		if (options.filter) {
			node.prop.match(options.filter) && declarations.push(node);
		} else {
			declarations.push(node);
		}
	});
	return declarations;
};
