import { matchesSelectorSet } from './matches-selector-set';

describe(matchesSelectorSet, () => {
	it('Matches exact sets regardless of order or formatting in the configured branches', () => {
		const selectors = [':focus-visible', ':hover'];

		expect(matchesSelectorSet({ equals: [':hover', ':focus-visible'] }, selectors)).toBe(true);
		expect(matchesSelectorSet({ equals: [':not( .disabled )'] }, [':not(.disabled)'])).toBe(true);
		expect(matchesSelectorSet({ equals: [':hover.foo', '.foo:focus'] }, ['.foo:focus', '.foo:hover'])).toBe(true);
	});

	it('Rejects exact sets with a different size or different branches', () => {
		const selectors = [':focus-visible', ':hover'];

		expect(matchesSelectorSet({ equals: [':hover'] }, selectors)).toBe(false);
		expect(matchesSelectorSet({ equals: [':hover', ':active'] }, selectors)).toBe(false);
		expect(matchesSelectorSet({ equals: ['.foo.foo:hover'] }, ['.foo:hover'])).toBe(false);
		expect(matchesSelectorSet({ equals: [':hover::before'] }, ['::before:hover'])).toBe(false);
	});

	it('Allows extra branches in inclusive sets when the requested size matches', () => {
		const selectors = [':focus-visible', ':hover'];

		expect(matchesSelectorSet({ includes: [':hover'] }, selectors)).toBe(true);
		expect(matchesSelectorSet({ includes: [':hover'], size: 2 }, selectors)).toBe(true);
		expect(matchesSelectorSet({ includes: [':hover.foo'], size: 2 }, ['.foo:hover', '.foo:focus'])).toBe(true);
	});

	it('Rejects inclusive sets when a required branch or the requested size does not match', () => {
		const selectors = [':focus-visible', ':hover'];

		expect(matchesSelectorSet({ includes: [':hover'], size: 3 }, selectors)).toBe(false);
		expect(matchesSelectorSet({ includes: [':active'] }, selectors)).toBe(false);
	});

	it('Applies independent lower and upper bounds alongside required branches', () => {
		const pair = [':focus-visible', ':hover'];

		expect(matchesSelectorSet({ minSize: 2 }, pair)).toBe(true);
		expect(matchesSelectorSet({ minSize: 3 }, pair)).toBe(false);
		expect(matchesSelectorSet({ maxSize: 1 }, [':hover'])).toBe(true);
		expect(matchesSelectorSet({ includes: [':hover'], maxSize: 2 }, pair)).toBe(true);
		expect(matchesSelectorSet({ includes: [':hover'], maxSize: 2 }, [...pair, ':active'])).toBe(false);
		expect(matchesSelectorSet({ includes: [':active'], maxSize: 2 }, pair)).toBe(false);
	});
});
