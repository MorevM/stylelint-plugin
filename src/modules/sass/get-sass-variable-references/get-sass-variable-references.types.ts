/**
 * Controls where Sass variable references are recognized.
 *
 * `expression` recognizes references in unquoted expressions and interpolations.
 * `interpolation` recognizes references only inside `#{...}`.
 */
export type SassVariableReferenceMode = 'expression' | 'interpolation';

/**
 * Source location and syntax metadata of a Sass variable reference.
 */
export type SassVariableReference = {
	/**
	 * Exclusive end offset.
	 */
	end: number;

	/**
	 * Whether the reference is qualified by a module namespace.
	 */
	isModuleQualified: boolean;

	/**
	 * Authored variable name including the leading `$`.
	 */
	name: string;

	/**
	 * Inclusive start offset.
	 */
	start: number;
};
