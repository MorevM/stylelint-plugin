import { tsObject } from '@morev/utils';
import { normalizeProperty } from '../normalize-property/normalize-property';
import { LOGICAL_PROPERTIES, SHORTHAND_PROPERTIES } from './property-data';

const shorthands = new Map(tsObject.entries(SHORTHAND_PROPERTIES));
const logicalProperties = new Map(tsObject.entries(LOGICAL_PROPERTIES));

const propertyEffects = new Map<string, ReadonlySet<string>>();
/**
 * Collects and caches normalized property names affected by a declaration, including nested shorthands.
 *
 * @param   property   Authored property name to expand.
 *
 * @returns            Shared cached effect set, which callers must not mutate.
 */
const getPropertyEffects = (property: string): ReadonlySet<string> => {
	const name = normalizeProperty(property);
	const cached = propertyEffects.get(name);
	if (cached) return cached;

	const effects = new Set([name]);
	propertyEffects.set(name, effects);

	for (const related of shorthands.get(name) ?? []) {
		for (const effect of getPropertyEffects(related)) effects.add(effect);
	}
	return effects;
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
export const doPropertiesOverlap = (first: string, second: string): boolean => {
	const a = normalizeProperty(first);
	const b = normalizeProperty(second);

	if (a === b) return true;
	if (/^(?:--|\$)/u.test(a) || /^(?:--|\$)/u.test(b)) return false;
	if (a === 'all' || b === 'all') {
		const affectedProperty = a === 'all' ? b : a;
		// CSS excludes direction and unicode-bidi from the all shorthand's reset.
		return !['direction', 'unicode-bidi'].includes(affectedProperty);
	}

	const firstEffects = getPropertyEffects(a);
	const secondEffects = getPropertyEffects(b);
	for (const effect of firstEffects) {
		if (secondEffects.has(effect)) return true;
		if (logicalProperties.get(effect)?.some((physical) => secondEffects.has(physical))) return true;
	}

	return [...secondEffects].some((effect) => {
		return logicalProperties.get(effect)?.some((physical) => firstEffects.has(physical));
	});
};
