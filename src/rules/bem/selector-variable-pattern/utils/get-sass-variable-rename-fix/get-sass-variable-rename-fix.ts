import { isEmpty } from '@morev/utils';
import { isAtRule, isComment, isDeclaration, isNodeWithin, isRule } from '#modules/postcss';
import { getSassVariableReferences, isSimpleSassVariableName, normalizeSassMemberName } from '#modules/sass';
import type { Declaration, Node, Root } from 'postcss';
import type { SassVariableReference } from '#modules/sass';

/**
 * Mutable PostCSS string field that may contain SASS variable references.
 */
type MutableField = {
	/**
	 * Whether references in the field occur in a binding-sensitive context.
	 */
	binding?: boolean;

	/**
	 * Reads the current field value.
	 */
	get: () => string;

	/**
	 * Reference-scanning mode matching the field's SASS evaluation context.
	 */
	mode: 'expression' | 'interpolation';

	/**
	 * Replaces the current field value.
	 */
	set: (value: string) => void;
};

/**
 * At-rules whose parameters are treated as binding-sensitive during rename analysis.
 */
const BINDING_AT_RULES = new Set(['content', 'each', 'for', 'function', 'include', 'mixin']);

/**
 * Returns mutable string fields of a PostCSS node that may contain SASS variable references.
 *
 * @param   node   PostCSS node to inspect.
 *
 * @returns        Mutable fields with the reference-scanning mode appropriate for each field.
 */
const getMutableFields = (node: Node): MutableField[] => {
	if (isRule(node)) {
		return [{
			get: () => node.selector,
			set: (value) => { node.selector = value; },
			mode: 'interpolation',
		}];
	}

	if (isDeclaration(node)) {
		const fields: MutableField[] = [{
			get: () => node.value,
			set: (value) => { node.value = value; },
			mode: node.prop.startsWith('--') ? 'interpolation' : 'expression',
		}];

		if (!isSimpleSassVariableName(node.prop)) {
			fields.push({
				get: () => node.prop,
				set: (value) => { node.prop = value; },
				mode: 'interpolation',
			});
		}

		return fields;
	}

	if (isAtRule(node)) {
		return [
			{
				get: () => node.name,
				set: (value) => { node.name = value; },
				mode: 'interpolation',
			},
			{
				binding: BINDING_AT_RULES.has(node.name),
				get: () => node.params,
				set: (value) => { node.params = value; },
				mode: 'expression',
			},
		];
	}

	return [];
};

/**
 * Replaces variable references at their recorded source ranges.
 *
 * Replacements are applied from right to left so earlier ranges remain valid.
 *
 * @param   value         Authored field value.
 * @param   references    References whose ranges should be replaced.
 * @param   replacement   Replacement variable name.
 *
 * @returns               Field value with the requested references replaced.
 */
const replaceReferences = (
	value: string,
	references: SassVariableReference[],
	replacement: string,
) => {
	let result = value;
	for (const { start, end } of references.toSorted((a, b) => b.start - a.start)) {
		result = `${result.slice(0, start)}${replacement}${result.slice(end)}`;
	}
	return result;
};

/**
 * Creates an autofix that safely renames a local SASS variable and its references.
 *
 * The rename is limited to references after the declaration within the same rule.
 * No fix is created when another binding, dynamic lookup, or ambiguous reference could change its meaning.
 *
 * @param   root           Root containing the declaration and its references.
 * @param   declaration    Local SASS variable declaration to rename.
 * @param   expectedName   New variable name, including the `$` prefix.
 *
 * @returns                Deferred fix callback, or `undefined` when a safe rename cannot be guaranteed.
 */
export const getSassVariableRenameFix = (
	root: Root,
	declaration: Declaration,
	expectedName: string,
): (() => void) | undefined => {
	const parentRule = declaration.parent;
	if (!isRule(parentRule) || /!(?:default|global)\b/.test(declaration.value)) return;
	if (root.toString().includes('variable-exists(')) return;

	const actualName = declaration.prop;
	const actualCanonicalName = normalizeSassMemberName(actualName);
	const expectedCanonicalName = normalizeSassMemberName(expectedName);
	const declarations: Declaration[] = [];

	root.walkDecls((candidate) => {
		if (
			isSimpleSassVariableName(candidate.prop)
			&& [actualCanonicalName, expectedCanonicalName].includes(normalizeSassMemberName(candidate.prop))
		) {
			declarations.push(candidate);
		}
	});
	if (declarations.length !== 1 || declarations[0] !== declaration) return;

	const edits: Array<{ field: MutableField; references: SassVariableReference[] }> = [];
	let hasReachedDeclaration = false;
	let isUnsafe = false;

	root.walk((node) => {
		if (isUnsafe || isComment(node)) return;
		if (node === declaration) hasReachedDeclaration = true;

		const fields = getMutableFields(node);
		for (const field of fields) {
			if (isUnsafe) break;
			const references = getSassVariableReferences(field.get(), field.mode);
			const relevantReferences = references.filter((reference) => {
				const canonicalName = normalizeSassMemberName(reference.name);
				return canonicalName === actualCanonicalName
					|| canonicalName === expectedCanonicalName;
			});
			if (isEmpty(relevantReferences)) continue;

			const isUnsafeLocation = node === declaration
				|| !hasReachedDeclaration
				|| !isNodeWithin(node, parentRule, { inclusive: true });
			const hasUnsafeReference = Boolean(field.binding)
				|| relevantReferences.some((reference) => {
					if (reference.isModuleQualified) return true;
					if (actualCanonicalName === expectedCanonicalName) return false;

					return normalizeSassMemberName(reference.name) === expectedCanonicalName;
				});

			if (isUnsafeLocation || hasUnsafeReference) {
				isUnsafe = true;
				break;
			}

			edits.push({ field, references: relevantReferences });
		}
	});

	if (isUnsafe) return;

	return () => {
		declaration.prop = expectedName;
		for (const { field, references } of edits) {
			field.set(replaceReferences(field.get(), references, expectedName));
		}
	};
};
