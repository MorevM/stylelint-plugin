import { normalizeLocalSelector } from './normalize-local-selector';

describe(normalizeLocalSelector, () => {
	it('Normalizes compound qualifiers without rejecting branches inside functional pseudos', () => {
		expect(normalizeLocalSelector('[aria-expanded = "true"]:not( .disabled )'))
			.toBe('[aria-expanded="true"]:not(.disabled)');
		expect(normalizeLocalSelector(':is(:hover, :focus)')).toBe(':is(:hover,:focus)');
	});

	it('Rejects subject replacements, selector lists and combinators', () => {
		expect(normalizeLocalSelector('&:hover')).toBeUndefined();
		expect(normalizeLocalSelector('button:hover')).toBeUndefined();
		expect(normalizeLocalSelector(':hover, :focus')).toBeUndefined();
		expect(normalizeLocalSelector(':hover > .child')).toBeUndefined();
	});

	it('Rejects empty and malformed selectors', () => {
		expect(normalizeLocalSelector('')).toBeUndefined();
		expect(normalizeLocalSelector('   ')).toBeUndefined();
		expect(normalizeLocalSelector(':not(')).toBeUndefined();
	});
});
