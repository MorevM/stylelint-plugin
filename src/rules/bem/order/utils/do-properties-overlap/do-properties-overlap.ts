import { tsObject } from '@morev/utils';
import { normalizeProperty } from '../normalize-property/normalize-property';
import { LOGICAL_PROPERTIES, SHORTHAND_PROPERTIES } from './property-data';

const shorthands = new Map(tsObject.entries(SHORTHAND_PROPERTIES));
const RESETTABLE_PROPERTIES = Symbol('properties affected by all');

/**
 * Effect keys used to detect competing writes, including CSS resets.
 */
type PropertyEffects = {
	/**
	 * Direct writes registered when this declaration is encountered.
	 */
	writes: ReadonlyArray<string | symbol>;

	/**
	 * Previous writes that can make a reorder observable.
	 */
	conflicts: ReadonlyArray<string | symbol>;
};

// Keep each logical edge distinct even when two logical properties can affect the same physical side.
const counterparts = new Map<string, Set<string>>();
for (const [logical, physicalNames] of tsObject.entries(LOGICAL_PROPERTIES)) {
	for (const physical of physicalNames) {
		if (!counterparts.has(physical)) counterparts.set(physical, new Set());
		counterparts.get(physical)!.add(logical);
	}
	counterparts.set(logical, new Set(physicalNames));
}

/**
 * Expands nested shorthands into all the properties they directly affect.
 *
 * @param   name      Canonical property or shorthand to expand.
 * @param   effects   Direct effects collected for the outermost declaration.
 */
const expandShorthand = (name: string, effects: Set<string>) => {
	if (effects.has(name)) return;
	effects.add(name);
	for (const related of shorthands.get(name) ?? []) expandShorthand(normalizeProperty(related), effects);
};

// Only names from the CSS property tables are cached across stylesheets.
const knownEffects = new Map<string, PropertyEffects>();
for (const name of new Set([...shorthands.keys(), ...counterparts.keys()])) {
	const direct = new Set<string>();
	expandShorthand(name, direct);
	const conflicts = new Set(direct);
	for (const effect of direct) {
		for (const counterpart of counterparts.get(effect) ?? []) conflicts.add(counterpart);
	}
	knownEffects.set(name, { writes: [...direct, RESETTABLE_PROPERTIES], conflicts: [...conflicts, 'all'] });
}

/**
 * Describes what a declaration writes and which previous writes can change its cascade.
 *
 * @param   property   Authored property or variable name.
 *
 * @returns            Effect keys shared by the conflict detector and dependency-preserving sorters.
 */
const getPropertyEffects = (property: string): PropertyEffects => {
	const name = normalizeProperty(property);
	const known = knownEffects.get(name);
	if (known) return known;
	if (name === 'all') return { writes: [name], conflicts: [name, RESETTABLE_PROPERTIES] };
	if (name.startsWith('--') || name.startsWith('$') || name === 'direction' || name === 'unicode-bidi') {
		return { writes: [name], conflicts: [name] };
	}
	return { writes: [name, RESETTABLE_PROPERTIES], conflicts: [name, 'all'] };
};

/**
 * Detects declaration pairs whose source order may affect the cascade or fallback behavior.
 * Unknown writing modes are handled conservatively for physical and logical properties.
 *
 * @param   first    First authored property name.
 * @param   second   Second authored property name.
 *
 * @returns          Whether the relative order must be retained.
 */
const doPropertiesOverlap = (first: string, second: string): boolean => {
	const { writes } = getPropertyEffects(first);
	const { conflicts } = getPropertyEffects(second);
	return writes.some((effect) => conflicts.includes(effect));
};

export { doPropertiesOverlap, getPropertyEffects, RESETTABLE_PROPERTIES };
