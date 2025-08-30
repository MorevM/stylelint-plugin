import { isNullish } from '@morev/utils';
import parseValue from 'postcss-value-parser';
import type { Node as ValueNode } from 'postcss-value-parser';
import type { ResolvedSelectorSubstitutions } from '#modules/selectors';

type Variables = Exclude<ResolvedSelectorSubstitutions, null>;

/**
 * Resolves a word literal that may contain one or more Sass interpolations of the form `#{...}`.
 *
 * Note: This is a narrow, deterministic resolver intended for lint-time constant folding.
 * It does not attempt to parse full Sass expression grammar inside `#{...}`.
 *
 * @example
 * resolveWordWithInterpolations('#{$b}__link', { '$b': '.block' }) // '.block__link'
 *
 * @param   word   A single word token value that may contain `#{...}` segments.
 * @param   vars   Map of known variables (including '&') to their concrete string values.
 *
 * @returns        The word with all simple interpolations substituted, or null if any interpolation is unsupported.
 */
const resolveWordWithInterpolations = (word: string, vars: Variables): string | null => {
	// Very narrow parser: allow only #{<single-token>} where token is `$var` or `&`
	// e.g. "#{$b}", "#{&}"
	const re = /#{([^}]+)}/g;

	let out = '';
	let lastIndex = 0;
	for (let m = re.exec(word); m; m = re.exec(word)) {
		out += word.slice(lastIndex, m.index);
		const inner = m[1].trim();

		// Disallow anything complex inside interpolation
		if (!(inner === '&' || inner.startsWith('$'))) return null;

		const replacement = vars[inner];
		if (isNullish(replacement)) return null;

		out += replacement;
		lastIndex = m.index + m[0].length;
	}
	out += word.slice(lastIndex);

	// If after substitution we still have an unmatched "#{", bail out
	if (out.includes('#{')) return null;

	return out;
};

/**
 * Resolves a single operand token into a plain string or returns null if it is not a simple string operand.
 *
 * @param   node   A single normalized token that is expected to represent an operand.
 * @param   vars   Map of known variables (including '&') to their concrete string values.
 *
 * @returns        Resolved string for the operand, or `null` if the operand is not statically resolvable.
 */
const resolveOperand = (node: ValueNode, vars: Variables): string | null => {
	// Any function call => complex
	if (node.type === 'function') return null;
	// Quoted string literal
	if (node.type === 'string') return node.value;
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
			return vars[node.value] ?? null;
		}

		// Word with possible interpolations like "#{$b}__link" or "#{&}--mod"
		if (node.value.includes('#{')) {
			return resolveWordWithInterpolations(node.value, vars);
		}

		// Bare word literal (treat as string chunk)
		return node.value;
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
 * @param   nodes   Value nodes with spaces/comments already removed.
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
 * Resolve a SCSS variable value to a plain string when it's composed only of
 * concatenations of known strings/variables and simple interpolations.
 *
 * Supported:
 * - String literals: 'foo', "bar", bare words like `.block` or `__link`
 * - Variables (including '&'): `$b`, `&` — must be present in variablesMap
 * - Concatenation with `+`: `$b + '__link' + '--active'`
 * - Interpolations inside a word: `#{$b}__link`, `#{&}--active`
 *
 * Not supported (returns `null`):
 * - Any function calls: `my-func($x)`, `darken($c, 10%)`, `str-slice(...)`
 * - Any operators except `+` used for string concatenation
 * - Interpolation containing anything other than a single variable or `&`
 * - Unknown variables (missing or mapped to `null`)
 *
 * @param   value       A variable value to resolve.
 * @param   variables
 *
 * @returns
 */
export const resolveSassVariable = (
	value: string,
	variables: Variables,
): string | null => {
	// Flat token stream, skip spaces and comments.
	const tokens = normalizeTokens(
		parseValue(value).nodes
			.filter((n) => n.type !== 'space' && n.type !== 'comment'),
	);

	let expectOperand = true;
	let acc = '';

	for (const token of tokens) {
		if (expectOperand) {
			const part = resolveOperand(token, variables);
			if (part === null) return null;
			acc += part;
			expectOperand = false;
			continue;
		}

		// Expect a `+` between operands
		if (token.type === 'word' && token.value === '+') {
			expectOperand = true;
			continue;
		}

		// Anything else between operands is not a simple concatenation
		return null;
	}

	// Trailing `+` without an operand
	// Actually invalid scenario in terms of SASS, but should be handled.
	if (expectOperand) return null;

	return acc;
};
