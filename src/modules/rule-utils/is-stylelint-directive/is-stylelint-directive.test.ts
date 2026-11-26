import postcss from 'postcss';
import { isStylelintDirective } from './is-stylelint-directive';
import type { Rule } from 'postcss';

describe(isStylelintDirective, () => {
	it('Recognizes directive markers only in comments without validating their syntax', () => {
		// cspell:ignore xstylelint -- Intentional prefix tests the directive marker's word boundary.
		const root = postcss.parse(`
			/* stylelint-disable color-named */
			/* note: stylelint-custom */
			/* xstylelint-disable */
			/* A regular comment */
			.card { content: "stylelint-disable"; }
		`);
		const [directive, marker, similar, comment, rule] = root.nodes;

		expect(isStylelintDirective(directive)).toBe(true);
		expect(isStylelintDirective(marker)).toBe(true);
		expect(isStylelintDirective(similar)).toBe(false);
		expect(isStylelintDirective(comment)).toBe(false);
		expect(isStylelintDirective((rule as Rule).first)).toBe(false);
		expect(isStylelintDirective(undefined)).toBe(false);
	});
});
