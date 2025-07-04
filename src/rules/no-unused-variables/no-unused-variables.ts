import * as v from 'valibot';
import { addNamespace, createRule, getRuleUrl, isCssFile, toRegExp } from '#utils';
import { stringOrRegExpSchema } from '#valibot';
import type { Declaration, Node } from 'postcss';

const RULE_NAME = 'no-unused-variables';

type Scope = {
	variables: Map<string, Declaration>;
	usages: Set<string>;
};

const findVariables = (input: string, onlyInterpolated: boolean) => {
	const regExp = onlyInterpolated
		? /#{(\$[\w-]+)}/g
		: /(?<!["'\\])(\$[\w-]+)/g;

	return [...input.matchAll(regExp)].reduce<string[]>((acc, current) => {
		const [_, variableName] = current;
		if (variableName) acc.push(variableName);
		return acc;
	}, []);
};

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		unused: (name: string) => `Unexpected unused variable: "${name}"`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				checkRoot: v.optional(v.boolean(), false),
				ignore: v.optional(v.array(stringOrRegExpSchema), []),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const seenVariables = new Set<Declaration>();
	const scopesMap = new Map<Node, Scope>();

	// First, we create a scope for every variable we encounter.
	root.walkDecls(/^\$[\w-]+$/, (declaration) => {
		const { parent } = declaration;

		// Top-level variables can be imported by other files,
		// so they are not checked by default.
		if (!parent || (!secondary.checkRoot && parent === root)) return;

		if (!scopesMap.has(parent)) {
			scopesMap.set(parent, { usages: new Set(), variables: new Map() });
		}

		// If multiple variables share the same name,
		// only the most recent one should be taken into account.
		scopesMap.get(parent)!.variables.set(declaration.prop, declaration);
		seenVariables.add(declaration);
	});

	// Utility function for the next loop.
	// Returns the closest parent scope, if any.
	const getParentScopeNode = (node: Node): Node | null => {
		let parent: Node | undefined = node.parent;
		while (parent && parent !== root) {
			if (scopesMap.has(parent)) return parent;
			parent = parent.parent;
		}
		return null;
	};

	// Next, we collect all used variables
	// and register their usage in each corresponding scope.
	root.walk((node) => {
		if (node.type === 'comment') return;

		const variables = (() => {
			if (node.type === 'rule') {
				// #{$b}__element
				return findVariables(node.selector, true);
			}

			if (node.type === 'decl') {
				// Do not count the variable's own declaration as its usage;
				// only the value should be checked
				// for scenarios like `$foo: #{$bar}__baz`.
				if (seenVariables.has(node)) {
					return findVariables(node.value, false);
				}

				return [
					// #{$property}: 100px;
					...findVariables(node.prop, false),
					// width: $width;
					...findVariables(node.value, false),
				];
			}

			if (node.type === 'atrule') {
				return [
					// @#{$at-rule-name}
					...findVariables(node.name, true),
					// @media ($breakpoint-tablet-small)
					...findVariables(node.params, false),
				];
			}

			return [];
		})();

		// When a variable is used within a nested rule,
		// it is treated as used for all its parent scopes.
		let parentScopeNode = getParentScopeNode(node);
		while (parentScopeNode) {
			const parentScope = scopesMap.get(parentScopeNode);
			variables.forEach((variable) => parentScope?.usages.add(variable));
			parentScopeNode = getParentScopeNode(parentScopeNode);
		}
	});

	// Normalize ignore patterns.
	const normalizedIgnorePatterns = secondary.ignore
		.map((pattern) => toRegExp(pattern, { allowWildcard: true }));

	// Finally, report all unused variables.
	scopesMap.forEach((scope) => {
		scope.variables.forEach((declaration, name) => {
			if (scope.usages.has(name)) return;

			const isIgnored = normalizedIgnorePatterns
				.some((pattern) => pattern.test(name.slice(1)));

			if (isIgnored) return;

			report({
				message: messages.unused(name),
				node: declaration,
			});
		});
	});
});
