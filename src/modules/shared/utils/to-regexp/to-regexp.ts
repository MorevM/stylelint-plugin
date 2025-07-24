import { escapeRegExp, isRegExp } from '@morev/utils';
import { parseRegExpFromString } from '../parse-regexp-from-string/parse-regexp-from-string';

type Options = {
	allowWildcard: boolean;
};

const DEFAULTS: Options = {
	allowWildcard: false,
};

export const toRegExp = (value: string | RegExp, userOptions?: Partial<Options>) => {
	const options = { ...DEFAULTS, ...userOptions };
	if (isRegExp(value)) return value;

	const match = parseRegExpFromString(value);
	if (match) return new RegExp(match.pattern, match.flags);

	if (options.allowWildcard && value.includes('*')) {
		return new RegExp(`^${escapeRegExp(value).replaceAll('\\*', '.*')}$`);
	}

	return new RegExp(`^${escapeRegExp(value)}$`);
};
