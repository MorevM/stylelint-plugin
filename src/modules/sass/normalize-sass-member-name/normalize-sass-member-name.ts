/**
 * Normalizes a Sass member name for identifier-equivalent lookup.
 * Sass treats hyphens and underscores as the same character in variable, function, and mixin names.
 *
 * @see https://sass-lang.com/documentation/variables/
 * @see https://sass-lang.com/documentation/at-rules/function/
 * @see https://sass-lang.com/documentation/at-rules/mixin/
 *
 * @param   name   Sass member name.
 *
 * @returns        Canonical member name.
 */
export const normalizeSassMemberName = (name: string) => name.replaceAll('_', '-');
