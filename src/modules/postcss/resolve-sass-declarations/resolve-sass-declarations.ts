import {
	isSimpleSassVariableName,
	normalizeSassMemberName,
	resolveSassValueWithMeta,
} from '#modules/sass';
import type { ChildNode, Container, Declaration } from 'postcss';
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
export type ResolvedSassDeclaration = {
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
 * Resolves direct SASS declarations sequentially within a PostCSS container.
 *
 * @param   node      Container whose direct declarations should be resolved.
 * @param   options   Resolution context and inherited variables.
 *
 * @returns           Resolved declarations and direct bindings created by the container.
 */
export const resolveSassDeclarations = (
	node: Container,
	options: Options = {},
) => {
	const variables = { ...options.inheritedVariables };
	const directVariables: SassVariableBindings = {};
	const declarations: ResolvedSassDeclaration[] = [];

	for (const child of node.nodes ?? []) {
		if (child === options.stopBefore) break;
		if (child.type !== 'decl' || !isSimpleSassVariableName(child.prop)) continue;

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
