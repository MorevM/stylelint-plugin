import type { SassVariableReference, SassVariableReferenceMode } from './get-sass-variable-references.types';

type Context = {
	/**
	 * Current nested-brace depth inside an interpolation.
	 */
	braceDepth: number;

	/**
	 * Active quote delimiter.
	 */
	quote: '"' | "'" | null;

	/**
	 * Kind of the current parsing context.
	 */
	type: 'base' | 'interpolation';
};

/**
 * Finds references to simple Sass variables in an authored string.
 *
 * Skips escaped characters, comments, and quoted content outside interpolation.
 * Returned offsets refer to the original string and can be used for replacements.
 *
 * @param   input   Authored string to inspect.
 * @param   mode    Contexts in which references should be recognized.
 *
 * @returns         Variable references in source order.
 */
export const getSassVariableReferences = (
	input: string,
	mode: SassVariableReferenceMode,
): SassVariableReference[] => {
	const references: SassVariableReference[] = [];
	const contexts: Context[] = [{ braceDepth: 0, quote: null, type: 'base' }];

	for (let index = 0; index < input.length; index++) {
		const context = contexts.at(-1) as Context;
		const character = input[index];

		// An escaped character cannot start syntax recognized by the scanner.
		if (character === '\\') {
			index++;
			continue;
		}

		// Interpolation opens a new parsing context even inside quoted content.
		if (input.startsWith('#{', index)) {
			contexts.push({ braceDepth: 1, quote: null, type: 'interpolation' });
			index++;
			continue;
		}

		// Plain quoted content is emitted as text and cannot contain direct references.
		if (context.quote) {
			if (character === context.quote) context.quote = null;
			continue;
		}

		if (character === '"' || character === "'") {
			context.quote = character;
			continue;
		}

		// Sass variable syntax inside a CSS block comment is not evaluated.
		if (input.startsWith('/*', index)) {
			const commentEnd = input.indexOf('*/', index + 2);
			index = commentEnd === -1 ? input.length : commentEnd + 1;
			continue;
		}

		// Nested braces must not close the surrounding interpolation prematurely.
		if (context.type === 'interpolation') {
			if (character === '{') context.braceDepth++;
			if (character === '}') {
				context.braceDepth--;
				if (context.braceDepth === 0) contexts.pop();
				continue;
			}
		}

		// Selectors and custom properties evaluate variables only inside interpolation.
		if (
			character !== '$'
			|| (mode === 'interpolation' && context.type !== 'interpolation')
		) continue;

		const match = input.slice(index).match(/^\$[\w-]+/);
		if (!match) continue;

		// Module-qualified references do not refer to bindings in the current scope.
		const previousCharacter = input[index - 1];
		references.push({
			start: index,
			end: index + match[0].length,
			name: match[0],
			isModuleQualified: previousCharacter === '.',
		});
		index += match[0].length - 1;
	}

	return references;
};
