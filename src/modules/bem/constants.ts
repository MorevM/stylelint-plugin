import type { Separators } from '#modules/shared';

// Defines processing order for BEM entities to respect parent-child dependency
export const BEM_ENTITIES = ['block', 'element', 'modifierName', 'modifierValue'] as const;

export const DEFAULT_SEPARATORS: Separators = {
	elementSeparator: '__',
	modifierSeparator: '--',
	modifierValueSeparator: '--',
};
