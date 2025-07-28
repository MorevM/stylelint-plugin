/**
 * Defines the separators used to parse BEM class names.
 */
export type Separators = {
	/**
	 * Separator between block and element.
	 *
	 * @example '__'
	 */
	element: string;

	/**
	 * Separator between entity and modifier name.
	 *
	 * @example '--'
	 */
	modifier: string;

	/**
	 * Separator between modifier name and value.
	 *
	 * @example '--'
	 */
	modifierValue: string;
};
