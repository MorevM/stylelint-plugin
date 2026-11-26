import { tsObject } from '@morev/utils';

const PROPERTY_ALIASES: Readonly<Record<string, string>> = {
	'grid-gap': 'gap',
	'grid-row-gap': 'row-gap',
	'grid-column-gap': 'column-gap',
	'word-wrap': 'overflow-wrap',
	'font-stretch': 'font-width',
};
const aliases = new Map(tsObject.entries(PROPERTY_ALIASES));

/**
 * Provides one comparison identity without rewriting authored property names.
 * Custom properties and Sass variables retain their case-sensitive identities.
 *
 * @param   name   Authored property or variable name.
 *
 * @returns        Canonical comparison name.
 */
export const normalizeProperty = (name: string): string => {
	if (name.startsWith('--') || name.startsWith('$')) return name;

	const unprefixed = name.toLowerCase().replace(/^-(?:epub|khtml|moz|ms|o|webkit)-/u, '');
	return aliases.get(unprefixed) ?? unprefixed;
};
