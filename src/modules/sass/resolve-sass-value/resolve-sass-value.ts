import { isNullish } from '@morev/utils';
import parseValue from 'postcss-value-parser';
import { normalizeSassMemberName } from '../normalize-sass-member-name/normalize-sass-member-name';
import type { Node as ValueNode } from 'postcss-value-parser';
import type { ResolvedSassValue, SassVariableBindings } from '../types';

const SIMPLE_INTERPOLATION_REGEXP = /#{\s*(&|\$[\w-]+)\s*}/g;

/**
 * Removes insignificant whitespace from simple Sass interpolations.
 *
 * This keeps `#{ $b }__link` in one parser word.
 * Resolution still happens after parsing.
 * Complex expressions remain unchanged and unsupported.
 *
 * @param   value   Sass value to normalize.
 *
 * @returns         Value with compact simple interpolations.
 */
const normalizeSimpleInterpolations = (value: string) => {
	return value.replaceAll(
		SIMPLE_INTERPOLATION_REGEXP,
		(_fullMatch, reference: string) => `#{${reference}}`,
	);
};

/**
 * Resolves a word literal that may contain one or more Sass interpolations of the form `#{...}`.
 *
 * Note: This is a narrow, deterministic resolver intended for lint-time constant folding.
 * It does not attempt to parse full Sass expression grammar inside `#{...}`.
 *
 * @example
 * resolveWordWithInterpolations('#{$b}__link', { '$b': '.block' }) // '.block__link'
 *
 * @param   word        A single word token value that may contain `#{...}` segments.
 * @param   variables   Map of known variables (including '&') to their concrete string values.
 *
 * @returns             The word with all simple interpolations substituted, or null if any interpolation is unsupported.
 */
const resolveWordWithInterpolations = (
	word: string,
	variables: SassVariableBindings,
): ResolvedSassValue | null => {
	// Very narrow parser: allow only #{<single-token>} where token is `$var` or `&`
	// e.g. "#{$b}", "#{&}"
	const re = /#{([^}]+)}/g;

	let out = '';
	const literalRanges: ResolvedSassValue['literalRanges'] = [];
	let lastIndex = 0;
	for (let m = re.exec(word); m; m = re.exec(word)) {
		const literal = word.slice(lastIndex, m.index);
		if (literal) {
			literalRanges.push([out.length, out.length + literal.length]);
			out += literal;
		}
		const inner = m[1].trim();

		// Disallow anything complex inside interpolation
		if (!(inner === '&' || inner.startsWith('$'))) return null;

		const replacement = variables[normalizeSassMemberName(inner)];
		if (isNullish(replacement)) return null;

		out += replacement;
		lastIndex = m.index + m[0].length;
	}

	const trailingLiteral = word.slice(lastIndex);
	if (trailingLiteral) {
		literalRanges.push([out.length, out.length + trailingLiteral.length]);
		out += trailingLiteral;
	}

	// If after substitution we still have an unmatched "#{", bail out
	if (out.includes('#{')) return null;

	return { value: out, literalRanges };
};

/**
 * Resolves a single operand token into a plain string or returns null if it is not a simple string operand.
 *
 * @param   node        A single normalized token that is expected to represent an operand.
 * @param   variables   Map of known variables (including '&') to their concrete string values.
 *
 * @returns             Resolved string for the operand, or `null` if the operand is not statically resolvable.
 */
const resolveOperand = (node: ValueNode, variables: SassVariableBindings): ResolvedSassValue | null => {
	// Any function call => complex
	if (node.type === 'function') return null;
	// Quoted string literal
	if (node.type === 'string') {
		return node.value.includes('#{')
			? resolveWordWithInterpolations(node.value, variables)
			: { value: node.value, literalRanges: [[0, node.value.length]] };
	}
	// A "word" can be:
	// - a bare literal: .block, __link, --active
	// - a variable: $b
	// - an ampersand: &
	// - a word containing interpolations: #{$b}__link or #{&}--active
	if (node.type === 'word') {
		// Plus sign is handled at the caller level
		if (node.value === '+') return null;

		// Pure variable or ampersand
		if (node.value.startsWith('$') || node.value === '&') {
			const value = variables[normalizeSassMemberName(node.value)];
			return isNullish(value) ? null : { value, literalRanges: [] };
		}

		// Word with possible interpolations like "#{$b}__link" or "#{&}--mod"
		if (node.value.includes('#{')) {
			return resolveWordWithInterpolations(node.value, variables);
		}

		// Bare word literal (treat as string chunk)
		return { value: node.value, literalRanges: [[0, node.value.length]] };
	}

	// `div` (e.g. `/`, `,`) and other node types
	// are not supported in "simple string" context
	return null;
};

/**
 * Normalizes a token stream from `postcss-value-parser` for Sass-style string concatenation.
 *
 * Why:
 * `postcss-value-parser` does not emit a `word` token for `+` when it is glued to another word,
 * e.g. `$b+'__x'` becomes [{ type: 'word', value: '$b+' }, { type: 'string', value: '__x' }].
 * Our resolver expects a `word` with `+` value regardless of whitespace.
 *
 * @param   nodes   Value nodes to normalize.
 *
 * @returns         A list of tokens where each `+` between words becomes a `{ type: 'word', value: '+' }`.
 */
const normalizeTokens = (nodes: ValueNode[]): ValueNode[] => {
	const tokens: ValueNode[] = [];

	for (const node of nodes) {
		if (node.type === 'word' && node.value.includes('+')) {
			const parts = node.value.split('+');

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (part) tokens.push({ ...node, value: part });
				if (i < parts.length - 1) {
					// @ts-expect-error -- We do not operate with indexes here,
					// so the absence of `sourceIndex` is insignificant.
					tokens.push({ type: 'word', value: '+' });
				}
			}
			continue;
		}

		tokens.push(node);
	}

	return tokens;
};

/**
 * Resolves a Sass value to a plain string when it consists only of
 * known strings, variables, and simple interpolations.
 *
 * Supported:
 * - String literals: 'foo', "bar", bare words like `.block` or `__link`
 * - Variables (including '&'): `$b`, `&` — must have a known binding
 * - Concatenation with `+`: `$b + '__link' + '--active'`
 * - Interpolations inside a word: `#{$b}__link`, `#{&}--active`
 *
 * Not supported (returns `null`):
 * - Any function calls: `my-func($x)`, `darken($c, 10%)`, `str-slice(...)`
 * - Any operators except `+` used for string concatenation
 * - Interpolation containing anything other than a single variable or `&`
 * - Unknown variables (missing or mapped to `null`)
 *
 * @param   value       Sass value to resolve.
 * @param   variables   Statically known variable bindings.
 *
 * @returns             Resolved value with literal provenance, or `null` when resolution is unsafe.
 */
export const resolveSassValueWithMeta = (
	value: string,
	variables: SassVariableBindings,
): ResolvedSassValue | null => {
	const normalizedVariables = Object.fromEntries(
		Object.entries(variables).map(([name, variableValue]) => {
			return [normalizeSassMemberName(name), variableValue];
		}),
	);
	// Flat token stream, skip comments.
	const normalizedValue = normalizeSimpleInterpolations(value);
	const valueNodes = parseValue(normalizedValue).nodes
		.filter((n) => n.type !== 'comment');
	const tokens = normalizeTokens(valueNodes);
	const hasExplicitConcatenation = tokens
		.some((token) => token.type === 'word' && token.value === '+');

	if (!hasExplicitConcatenation) {
		let hasOperand = false;
		let pendingSpace = '';
		const result: ResolvedSassValue = { value: '', literalRanges: [] };

		for (const token of tokens) {
			if (token.type === 'space') {
				if (hasOperand) pendingSpace += token.value;
				continue;
			}
			if (token.type === 'word' && ['-', '*', '%'].includes(token.value)) return null;

			const part = resolveOperand(token, normalizedVariables);
			if (part === null) return null;
			if (pendingSpace) {
				result.literalRanges.push([
					result.value.length,
					result.value.length + pendingSpace.length,
				]);
				result.value += pendingSpace;
				pendingSpace = '';
			}
			const offset = result.value.length;
			result.value += part.value;
			result.literalRanges.push(
				...part.literalRanges.map(([start, end]) => [start + offset, end + offset] as [number, number]),
			);
			hasOperand = true;
		}

		return hasOperand ? result : null;
	}

	const tokensWithoutSpaces = tokens.filter((token) => token.type !== 'space');

	let isExpectingOperand = true;
	const acc: ResolvedSassValue = { value: '', literalRanges: [] };

	for (const token of tokensWithoutSpaces) {
		if (isExpectingOperand) {
			const part = resolveOperand(token, normalizedVariables);
			if (part === null) return null;
			const offset = acc.value.length;
			acc.value += part.value;
			acc.literalRanges.push(
				...part.literalRanges.map(([start, end]) => [start + offset, end + offset] as [number, number]),
			);
			isExpectingOperand = false;
			continue;
		}

		// Expect a `+` between operands
		if (token.type === 'word' && token.value === '+') {
			isExpectingOperand = true;
			continue;
		}

		// Anything else between operands is not a simple concatenation
		return null;
	}

	// Trailing `+` without an operand
	// Actually invalid scenario in terms of SASS, but should be handled.
	if (isExpectingOperand) return null;

	return acc;
};

export const resolveSassValue = (
	value: string,
	variables: SassVariableBindings,
): string | null => resolveSassValueWithMeta(value, variables)?.value ?? null;
