import { inspect } from 'node:util';

/**
 * Logs a deeply-inspected representation of the given value.
 *
 * @param   value   Any value to inspect and print.
 * @param   depth   Maximum depth to recurse into nested objects (default: 4).
 */
export const log = (value: unknown, depth = 4) => {
	// eslint-disable-next-line no-console
	console.log(inspect(value, { depth, colors: true }));
};
