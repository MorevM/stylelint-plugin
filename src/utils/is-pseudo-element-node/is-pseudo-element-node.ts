import type parser from 'postcss-selector-parser';

const KNOWN_PSEUDO_ELEMENTS = new Set([
	'before', 'after',
	'first-letter', 'first-line',
	'marker',
	'selection', 'highlight',
	'scroll-button', 'scroll-marker', 'scroll-marker-group',
	'placeholder',
	'backdrop',
	'checkmark',
	'column',
	'details-content',
	'file-selector-button',
	'cue', 'cue-region',
	'part', 'slotted',
	'picker-icon', 'picker',
	'spelling-error', 'grammar-error',
	'target-text',
]);

/**
 * Determines whether a given selector node represents a CSS pseudo-element.
 *
 * The check reliably detects both modern double-colon pseudo-elements (e.g., `::before`, `::after`)
 * and legacy single-colon pseudo-elements (e.g., `:before`, `:after`) based on a known list.
 *
 * @param   node   A selector node parsed by `postcss-selector-parser`.
 *
 * @returns        `true` if the node represents a pseudo-element, `false` otherwise.
 */
export const isPseudoElementNode = (node: parser.Node | undefined) => {
	if (!node || node.type !== 'pseudo') return false;

	const value = node.value.toLowerCase();

	// Quick check: if it starts with double colons,
	// it's certainly a pseudo-element.
	if (value.startsWith('::') && value.length !== 2) return true;

	// A single colon likely a pseudo-class,
	// but might be an outdated pseudo-element syntax.
	if (value.startsWith(':')) {
		const baseName = value.slice(1).split('(')[0];
		return KNOWN_PSEUDO_ELEMENTS.has(baseName);
	}

	return false;
};
