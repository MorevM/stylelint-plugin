import { DEFAULT_SEPARATORS } from '#modules/bem';
import type { Separators } from '#modules/shared';

/**
 * Extracts and normalizes BEM separator configuration from partial options.
 *
 * Returns a complete `Separators` object by filling in missing fields
 * with defaults from `DEFAULT_SEPARATORS`.
 *
 * @param   options   Partial separator options, typically from rule configuration.
 *
 * @returns           Fully defined `Separators` object.
 */
export const extractSeparators = (
	options: Partial<Separators>,
): Separators => ({
	elementSeparator: options.elementSeparator ?? DEFAULT_SEPARATORS.elementSeparator,
	modifierSeparator: options.modifierSeparator ?? DEFAULT_SEPARATORS.modifierSeparator,
	modifierValueSeparator: options.modifierValueSeparator ?? DEFAULT_SEPARATORS.modifierValueSeparator,
});
