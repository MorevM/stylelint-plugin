/**
 * Defines the separators used to parse BEM class names.
 */
export type Separators = {
	/**
	 * Separator between block and element.
	 *
	 * @default '__'
	 */
	element: string;

	/**
	 * Separator between block/element and modifier name.
	 *
	 * @default '--'
	 */
	modifier: string;

	/**
	 * Separator between modifier name and modifier value.
	 *
	 * @default '--'
	 */
	modifierValue: string;
};
