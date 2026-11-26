import { normalizeParameters } from './normalize-parameters';

describe(normalizeParameters, () => {
	it('Normalizes query and invocation spacing while preserving quoted text', () => {
		expect(normalizeParameters('screen   and  (min-width:  40em )')).toBe('screen and (min-width:40em)');
		expect(normalizeParameters('theme( "two  words",  red )')).toBe('theme("two  words",red)');
	});

	it('Leaves already normalized parameters and quoted whitespace untouched', () => {
		expect(normalizeParameters('screen and (min-width:40em)')).toBe('screen and (min-width:40em)');
		expect(normalizeParameters('url("two  words")')).toBe('url("two  words")');
	});

	it('Returns an empty string when there are no parameters', () => {
		expect(normalizeParameters('')).toBe('');
		expect(normalizeParameters('   ')).toBe('');
	});
});
