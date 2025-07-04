export type Options = {
	/**
	 * The name of the variable containing the block reference.
	 *
	 * @default 'b' // based on the first letter of the BEM abbreviation.
	 */
	name: string;

	/**
	 * Whether the reference must contain an interpolation.
	 *
	 * @default 'always'
	 */
	interpolation: 'always' | 'never' | 'ignore';

	/**
	 * Whether a block reference should be the first declaration of an element.
	 *
	 * @default true
	 */
	firstChild: boolean;

	/**
	 * Whether to automatically replace hardcoded occurrences of the block name
	 * inside nested selectors with the corresponding block variable.
	 *
	 * @default true
	 */
	replaceBlockName: boolean;
};
