import postcss from 'postcss';
import { getRuleBySelector } from '#modules/test-utils';
import { getChildContaining } from './get-child-containing';
import type { Rule } from 'postcss';

describe(getChildContaining, () => {
	it('Returns a descendant that is already a direct child', () => {
		const root = postcss.parse(`.block {}`);
		const rule = getRuleBySelector<Rule>(root, '.block');

		expect(getChildContaining(root, rule)).toBe(rule);
	});

	it('Returns the direct child on the path to a deep descendant', () => {
		const root = postcss.parse(`
			.outer {
				.inner {
					color: red;
				}
			}
		`);
		const outerRule = getRuleBySelector<Rule>(root, '.outer');
		const innerRule = getRuleBySelector<Rule>(root, '.inner');
		const declaration = innerRule.first!;

		expect(getChildContaining(root, declaration)).toBe(outerRule);
		expect(getChildContaining(outerRule, declaration)).toBe(innerRule);
	});

	it('Returns `null` for the container itself', () => {
		const rule = getRuleBySelector<Rule>(`.block {}`);

		expect(getChildContaining(rule, rule)).toBeNull();
	});

	it('Returns `null` for nodes outside the container subtree', () => {
		const root = postcss.parse(`
			.first {}
			.second {}
		`);
		const firstRule = getRuleBySelector<Rule>(root, '.first');
		const secondRule = getRuleBySelector<Rule>(root, '.second');
		const detachedRule = getRuleBySelector<Rule>(`.detached {}`);
		detachedRule.remove();

		expect(getChildContaining(firstRule, secondRule)).toBeNull();
		expect(getChildContaining(firstRule, detachedRule)).toBeNull();
	});
});
