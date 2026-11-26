import { escapeRegExp, isRegExp } from '@morev/utils';
import { parseRegExpFromString } from '../parse-regexp-from-string/parse-regexp-from-string';

type Options = {
	allowWildcard: boolean;
};

const DEFAULTS: Options = {
	allowWildcard: false,
};

/**
 * Converts exact strings, optional wildcards, and string-form expressions to regular expressions.
 * Supplied expressions are copied with their flags and a fresh `lastIndex` to isolate consumer state.
 * Use `input.search(expression) !== -1` for independent checks with global or sticky expressions.
 *
 * @param   value         Pattern to normalize.
 * @param   userOptions   Whether plain strings support wildcards.
 *
 * @returns               An independent regular expression for this consumer.
 */
export const toRegExp = (value: string | RegExp, userOptions?: Partial<Options>) => {
	const options = { ...DEFAULTS, ...userOptions };
	// `search` may write to `lastIndex` before restoring it.
	// Copy user expressions so matching never writes to shared or frozen configuration objects.
	if (isRegExp(value)) return new RegExp(value.source, value.flags);

	const match = parseRegExpFromString(value);
	if (match) return new RegExp(match.pattern, match.flags);

	if (options.allowWildcard && value.includes('*')) {
		return new RegExp(`^${escapeRegExp(value).replaceAll('\\*', '.*')}$`);
	}

	return new RegExp(`^${escapeRegExp(value)}$`);
};
