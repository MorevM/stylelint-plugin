import { isString, toArray } from '@morev/utils';
import { CAMEL_CASE_NUMERIC_REGEXP, CAMEL_CASE_REGEXP, KEBAB_CASE_NUMERIC_REGEXP, KEBAB_CASE_REGEXP, PASCAL_CASE_NUMERIC_REGEXP, PASCAL_CASE_REGEXP, SNAKE_CASE_NUMERIC_REGEXP, SNAKE_CASE_REGEXP, toRegExp } from '#modules/shared';
import type { Arrayable } from '@morev/utils';
import type { ProcessedPattern } from '../../selector-pattern.types';

const PATTERN_REPLACEMENT_MAP = {
	KEBAB_CASE: KEBAB_CASE_REGEXP,
	KEBAB_CASE_NUMERIC: KEBAB_CASE_NUMERIC_REGEXP,
	PASCAL_CASE: PASCAL_CASE_REGEXP,
	PASCAL_CASE_NUMERIC: PASCAL_CASE_NUMERIC_REGEXP,
	CAMEL_CASE: CAMEL_CASE_REGEXP,
	CAMEL_CASE_NUMERIC: CAMEL_CASE_NUMERIC_REGEXP,
	SNAKE_CASE: SNAKE_CASE_REGEXP,
	SNAKE_CASE_NUMERIC: SNAKE_CASE_NUMERIC_REGEXP,
} as Record<string, RegExp>;

export const normalizePattern = (
	input: Arrayable<string | RegExp> | false,
): ProcessedPattern[] | false => {
	if (input === false) return false;

	return toArray(input).map((part) => {
		// Allow usage of string patterns like `KEBAB_CASE`
		if (isString(part) && PATTERN_REPLACEMENT_MAP[part]) {
			return { source: part, regexp: PATTERN_REPLACEMENT_MAP[part] };
		}

		return {
			source: part.toString(),
			regexp: toRegExp(part, { allowWildcard: true }),
		};
	});
};
