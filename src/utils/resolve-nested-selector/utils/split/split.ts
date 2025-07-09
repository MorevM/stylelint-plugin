const blockPairs = new Map([
	['(', ')'],
	['[', ']'],
	['{', '}'],
]);

/**
 * Splits a string by a separator, ignoring separators inside quotes or brackets.
 *
 * @param   string           The input string to split.
 * @param   separator        The character to split by.
 * @param   splitFunctions   Whether to allow splitting inside parentheses (only).
 *
 * @returns                  Array of string parts.
 */
export const split = (
	string: string,
	separator: string,
	splitFunctions: boolean,
): string[] => {
	const result: string[] = [];
	let current = '';

	// Stack of expected closing brackets
	const closingBracketsStack: string[] = [];

	let inQuote = false;
	let quoteChar = '';
	let escapeNext = false;

	for (const char of string) {
		if (escapeNext) {
			escapeNext = false;
		} else if (char === '\\') {
			escapeNext = true;
		} else if (inQuote) {
			if (char === quoteChar) {
				inQuote = false;
			}
		} else if (char === '"' || char === "'") {
			inQuote = true;
			quoteChar = char;
		} else if (blockPairs.has(char)) {
			closingBracketsStack.push(blockPairs.get(char)!);
		} else if (char === closingBracketsStack.at(-1)) {
			closingBracketsStack.pop();
		} else if (
			char === separator
			&& (
				closingBracketsStack.length === 0 // Outside any brackets
				|| (
					splitFunctions
					&& closingBracketsStack.every((c) => c === ')') // Only inside parentheses
				)
			)
		) {
			result.push(current);
			current = '';
			continue; // skip adding separator to current
		}

		current += char;
	}

	result.push(current);
	return result;
};
