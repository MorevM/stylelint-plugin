import { normalizeLocalSelector } from './normalize-local-selector';

describe(normalizeLocalSelector, () => {
	it('Normalizes compound qualifiers without rejecting branches inside functional pseudos', () => {
		expect(normalizeLocalSelector('[aria-expanded = "true"]:not( .disabled )'))
			.toBe(':not(.disabled)[aria-expanded="true"]');
		expect(normalizeLocalSelector(':is(:hover, :focus)')).toBe(':is(:hover,:focus)');
	});

	it('Ignores condition order while preserving repeated selectors and their specificity', () => {
		expect(normalizeLocalSelector(':hover.foo[aria-expanded="true"]'))
			.toBe(normalizeLocalSelector('[aria-expanded="true"].foo:hover'));
		expect(normalizeLocalSelector(':hover.foo.foo')).toBe('.foo.foo:hover');
		expect(normalizeLocalSelector(':hover.foo.foo')).not.toBe(normalizeLocalSelector('.foo:hover'));
	});

	it('Keeps functional pseudo arguments intact when ordering outer conditions', () => {
		expect(normalizeLocalSelector(':not(.disabled, .loading).foo'))
			.toBe('.foo:not(.disabled,.loading)');
		expect(normalizeLocalSelector('.foo:not(.disabled,.loading)'))
			.not.toBe(normalizeLocalSelector('.foo:not(.loading,.disabled)'));
	});

	it('Orders conditions only within their own pseudo-element stage', () => {
		expect(normalizeLocalSelector(':hover.foo::before:focus:active'))
			.toBe('.foo:hover::before:active:focus');
		expect(normalizeLocalSelector(':hover::before')).not.toBe(normalizeLocalSelector('::before:hover'));
		expect(normalizeLocalSelector(':hover:before')).toBe(normalizeLocalSelector(':hover::before'));
		expect(normalizeLocalSelector(':hover:before')).not.toBe(normalizeLocalSelector(':before:hover'));
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
