import postcss from 'postcss';
import { getRuleBySelector } from '#modules/test-utils';
import { isNodeWithin } from './is-node-within';
import type { AtRule, Rule } from 'postcss';

describe(isNodeWithin, () => {
	it('Recognizes descendants at any depth', () => {
		const root = postcss.parse(`
			.outer {
				@media (min-width: 1px) {
					color: red;
				}
			}
		`);
		const outerRule = getRuleBySelector<Rule>(root, '.outer');
		const atRule = getRuleBySelector<AtRule>(root, '(min-width: 1px)');
		const declaration = atRule.first!;

		expect(isNodeWithin(declaration, outerRule)).toBe(true);
	});

	it('Controls whether the container includes itself', () => {
		const rule = getRuleBySelector<Rule>(`.block {}`);

		expect(isNodeWithin(rule, rule)).toBe(false);
		expect(isNodeWithin(rule, rule, {
			inclusive: true,
		})).toBe(true);
	});

	it('Rejects nodes from another subtree', () => {
		const root = postcss.parse(`
			.first {}
			.second {}
		`);
		const firstRule = getRuleBySelector<Rule>(root, '.first');
		const secondRule = getRuleBySelector<Rule>(root, '.second');

		expect(isNodeWithin(secondRule, firstRule)).toBe(false);
	});
});
