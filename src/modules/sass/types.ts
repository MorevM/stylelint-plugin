/**
 * Statically known Sass variable bindings.
 */
export type SassVariableBindings = Record<string, string | null>;

/**
 * A statically resolved Sass value with its literal provenance.
 */
export type ResolvedSassValue = {
	/**
	 * Resolved string value.
	 */
	value: string;

	/**
	 * Ranges authored literally in the value being resolved.
	 */
	literalRanges: Array<[number, number]>;
};
