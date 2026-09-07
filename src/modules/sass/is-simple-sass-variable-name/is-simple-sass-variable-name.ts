/**
 * Checks whether a value is a simple Sass variable name supported by static analysis.
 *
 * @param   value   Value to check.
 *
 * @returns         Whether the value is a supported variable name.
 */
export const isSimpleSassVariableName = (value: string) => /^\$[\w-]+$/.test(value);
