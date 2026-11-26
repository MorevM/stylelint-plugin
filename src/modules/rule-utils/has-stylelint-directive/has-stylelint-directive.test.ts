import postcss from 'postcss';
import { hasStylelintDirective } from './has-stylelint-directive';
import type { AtRule, Rule } from 'postcss';

describe(hasStylelintDirective, () => {
	it('Finds directives in the node itself and nested containers without retaining stale results', () => {
		const root = postcss.parse(`
			@media screen {
				.card {
					/* stylelint-enable */
					color: red;
				}
			}
		`);
		const media = root.first as AtRule;
		const rule = media.first as Rule;
		const directive = rule.first!;

		expect(hasStylelintDirective(root)).toBe(true);
		expect(hasStylelintDirective(directive)).toBe(true);
		expect(hasStylelintDirective(rule.last!)).toBe(false);

		directive.remove();

		expect(hasStylelintDirective(root)).toBe(false);
	});
});
