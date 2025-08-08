import type { Separators } from '#modules/shared';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = true;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = {
	/**
	 * List of presets to apply globally. \
	 * Available built-in presets: `['EXTERNAL_GEOMETRY', 'CONTEXT', 'POSITIONING']`.
	 *
	 * @default ['EXTERNAL_GEOMETRY']
	 */
	presets?: string[];

	/**
	 * Custom property presets. \
	 * The key is the preset name, the value is an array of property names. \
	 *
	 * The preset name is passed to the `messages.unexpected` function as an argument (if matched)
	 * and can be used to generate more specific error messages.
	 *
	 * @default {}
	 */
	customPresets?: Record<string, string[]>;

	/**
	 * Properties that are globally allowed, regardless of presets or other restrictions.
	 *
	 * @default []
	 */
	allowProperties?: string[];

	/**
	 * Properties that are globally disallowed, regardless of presets.
	 *
	 * @default []
	 */
	disallowProperties?: string[];

	/**
	 * Fine-grained restrictions applied per BEM entity type.
	 *
	 * @default {}
	 */
	perEntity?: {
		/**
		 * Block-level restrictions.
		 *
		 * @default {}
		 */
		block?: {
			/**
			 * Additional presets to apply only for blocks.
			 *
			 * @default []
			 */
			presets?: string[];

			/**
			 * Properties explicitly allowed only for blocks.
			 *
			 * @default []
			 */
			allowProperties?: string[];

			/**
			 * Properties explicitly disallowed only for blocks.
			 *
			 * @default []
			 */
			disallowProperties?: string[];
		};

		/**
		 * Modifier-level restrictions.
		 */
		modifier?: {
			/**
			 * Additional presets to apply only for modifiers.
			 *
			 * @default []
			 */
			presets?: string[];

			/**
			 * Properties explicitly allowed only for modifiers.
			 *
			 * @default []
			 */
			allowProperties?: string[];

			/**
			 * Properties explicitly disallowed only for modifiers.
			 *
			 * @default []
			 */
			disallowProperties?: string[];
		};
	};

	/**
	 * List of block names to ignore entirely. \
	 * Supports plain strings, regular expressions,
	 * and wildcard-like patterns (e.g., 'swiper-*').
	 *
	 * @default []
	 */
	ignoreBlocks?: Array<string | RegExp>;

	/**
	 * Custom message functions for rule violations.
	 * If provided, overrides the default error messages.
	 *
	 * @default {}
	 */
	messages?: {
		/**
		 * Custom message for an unexpected property at block/modifier level.
		 *
		 * @param   propertyName
		 *
		 * @returns                The error message to report.
		 */
		unexpected?: (
			/**
			 * The name of the restricted CSS property.
			 *
			 * @example 'margin-block-start'
			 */
			propertyName: string,

			/**
			 * The full selector that triggered the rule.
			 *
			 * @example '.the-component'
			 */
			selector: string,

			/**
			 * The BEM entity type of selector.
			 *
			 * @example 'block'
			 */
			context: 'block' | 'modifier',

			/**
			 * The name of the preset that the property belongs to, if available.
			 *
			 * @example EXTERNAL_GEOMETRY
			 */
			presetName: string | undefined,
		) => string;
	};

	/**
	 * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
	 * This allows the rule to work correctly with non-standard BEM naming conventions.
	 *
	 * @default { element: '__', modifier: '--', modifierValue: '--' }
	 */
	separators?: Partial<Separators>;
};
