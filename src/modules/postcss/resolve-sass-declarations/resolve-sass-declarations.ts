import { isDeclaration } from '#modules/postcss/is-declaration/is-declaration';
import { isRoot } from '#modules/postcss/is-root/is-root';
import {
	isSimpleSassVariableName,
	normalizeSassMemberName,
	resolveSassValueWithMeta,
} from '#modules/sass';
import type { ChildNode, Container, Declaration, Root } from 'postcss';
import type { ResolvedSassValue, SassVariableBindings } from '#modules/sass';

type Options = {
	/**
	 * Selector represented by `&` in this container.
	 */
	context?: string;

	/**
	 * Variables inherited from outer containers.
	 */
	inheritedVariables?: SassVariableBindings;

	/**
	 * Stops before this direct child to preserve source-order visibility in nested branches.
	 */
	stopBefore?: ChildNode;
};

/**
 * A statically resolved direct SASS variable declaration.
 */
type ResolvedSassDeclaration = {
	/**
	 * Original PostCSS declaration.
	 */
	declaration: Declaration;

	/**
	 * Resolved value and ranges authored literally in this declaration.
	 */
	resolved: ResolvedSassValue | null;
};

/**
 * Indexes direct variables and the number visible before each child of the stylesheet.
 *
 * @param   root   Stylesheet being inspected.
 *
 * @returns        Declarations in source order and the boundaries for partial lookups.
 */
const indexRootDeclarations = (root: Root) => {
	const declarations: Declaration[] = [];
	const countBefore = new Map<ChildNode, number>();
	for (const child of root.nodes) {
		countBefore.set(child, declarations.length);
		if (isDeclaration(child) && isSimpleSassVariableName(child.prop)) declarations.push(child);
	}
	return { declarations, countBefore };
};

/**
 * Root data shared during one synchronous rule inspection.
 */
type RootScope = {
	/**
	 * Direct declarations and their source-order boundaries.
	 */
	index?: ReturnType<typeof indexRootDeclarations>;

	/**
	 * Complete bindings used by selector interpolation.
	 */
	variables?: SassVariableBindings;
};

const rootScopes = new WeakMap<Root, RootScope>();

/**
 * Shares root declarations until the rule returns. A fix can edit or reorder any declaration.
 *
 * @param   root   Stylesheet passed to the rule.
 * @param   mode   Read operations share bindings. Edits suspend reuse and invalidate the enclosing scope.
 * @param   run    Synchronous operation on the stylesheet.
 */
const withRootSassScope = (root: Root, mode: 'read' | 'edit', run: () => void) => {
	const wasActive = rootScopes.has(root);
	if (mode === 'read') rootScopes.set(root, {});
	else rootScopes.delete(root);
	try {
		run();
	} finally {
		// A nested inspection may have edited the same root.
		if (wasActive) rootScopes.set(root, {});
		else rootScopes.delete(root);
	}
};

/**
 * Resolves direct SASS declarations sequentially within a PostCSS container.
 *
 * @param   node      Container whose direct declarations should be resolved.
 * @param   options   Resolution context and inherited variables.
 *
 * @returns           Resolved declarations and direct bindings created by the container.
 */
const resolveSassDeclarations = (
	node: Container,
	options: Options = {},
) => {
	const variables = { ...options.inheritedVariables };
	const directVariables: SassVariableBindings = {};
	const declarations: ResolvedSassDeclaration[] = [];

	let children = node.nodes ?? [];
	let { stopBefore } = options;
	if (isRoot(node)) {
		const scope = rootScopes.get(node);
		if (scope) {
			scope.index ??= indexRootDeclarations(node);
			children = scope.index.declarations;
			stopBefore &&= children[scope.index.countBefore.get(stopBefore) ?? children.length];
		}
	}

	for (const child of children) {
		if (child === stopBefore) break;
		if (!isDeclaration(child) || !isSimpleSassVariableName(child.prop)) continue;

		const resolved = resolveSassValueWithMeta(child.value, {
			...variables,
			'&': options.context ?? null,
		});
		const canonicalName = normalizeSassMemberName(child.prop);
		const value = resolved?.value ?? null;

		variables[child.prop] = value;
		variables[canonicalName] = value;
		directVariables[child.prop] = value;
		directVariables[canonicalName] = value;
		declarations.push({ declaration: child, resolved });
	}

	return { declarations, variables: directVariables };
};

/**
 * Reads complete stylesheet bindings for a selector path. Standalone calls see the current AST.
 *
 * @param   root   Stylesheet containing the selector, or `null` for a detached node.
 *
 * @returns        Variables available to top-level selectors.
 */
const getRootSassVariables = (root: Root | null): SassVariableBindings => {
	if (!root) return {};
	const scope = rootScopes.get(root);
	if (!scope) return resolveSassDeclarations(root).variables;
	scope.variables ??= resolveSassDeclarations(root).variables;
	return scope.variables;
};

export { getRootSassVariables, resolveSassDeclarations, withRootSassScope };
export type { ResolvedSassDeclaration };
