/**
 * Defines the separators used to parse BEM class names.
 */
export type Separators = {
	/**
	 * Separator between block and element.
	 *
	 * @example '__'
	 */
	elementSeparator: string;

	/**
	 * Separator between entity and modifier name.
	 *
	 * @example '--'
	 */
	modifierSeparator: string;

	/**
	 * Separator between modifier name and value.
	 *
	 * @example '--'
	 */
	modifierValueSeparator: string;
};
