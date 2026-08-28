import { getRuleBySelector } from '#modules/test-utils';
import { hasAncestorRule } from './has-ancestor-rule';
import type { Rule } from 'postcss';

describe(hasAncestorRule, () => {
	it('Rejects a top-level rule', () => {
		const rule = getRuleBySelector<Rule>(`.block {}`);

		expect(hasAncestorRule(rule)).toBe(false);
	});

	it('Rejects a rule nested only in at-rules', () => {
		const rule = getRuleBySelector<Rule>(`
			@media (min-width: 1px) {
				.block {}
			}
		`, '.block');

		expect(hasAncestorRule(rule)).toBe(false);
	});

	it('Recognizes a direct ancestor rule', () => {
		const innerRule = getRuleBySelector<Rule>(`
			.outer {
				.inner {}
			}
		`, '.inner');

		expect(hasAncestorRule(innerRule)).toBe(true);
	});

	it('Recognizes an ancestor rule through an at-rule', () => {
		const innerRule = getRuleBySelector<Rule>(`
			.outer {
				@media (min-width: 1px) {
					.inner {}
				}
			}
		`, '.inner');

		expect(hasAncestorRule(innerRule)).toBe(true);
	});

	it('Accepts any node with a rule ancestor', () => {
		const rule = getRuleBySelector<Rule>(`
			.block {
				color: red;
			}
		`);
		const declaration = rule.first!;

		expect(hasAncestorRule(declaration)).toBe(true);
	});
});
