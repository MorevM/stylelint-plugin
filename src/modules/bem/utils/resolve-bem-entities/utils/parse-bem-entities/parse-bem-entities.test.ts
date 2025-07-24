/**
 * This file is intentionally left without dedicated tests.
 *
 * The `parseBemEntities` function is a low-level utility that is only meaningful
 * when used as part of the full `resolveBemEntities` pipeline. It relies on specific
 * selector resolution and matching behavior that is already covered extensively in the
 * tests for `resolveBemEntities`.
 *
 * Separate unit tests for this function would either duplicate existing coverage
 * or require artificial setup that does not reflect real usage.
 */

describe('parseBemEntities', () => {
	it('Intentionally empty', () => {
		expect(true).toBe(true);
	});
});
