import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { getRuleBySelector } from '#modules/test-utils';
import { getRuleContentMeta } from './get-rule-content-meta';
import type { AtRule } from 'postcss';

describe(getRuleContentMeta, () => {
	it('Returns correct meta for `Rule`', () => {
		const rule = getRuleBySelector(`.block:hover {}`, `.block:hover`);
		const result = getRuleContentMeta(rule);

		expect(result).toStrictEqual({
			raw: '.block:hover',
			source: '.block:hover',
			offset: 0,
		});
	});

	it('Returns correct meta for `AtRule` with spacing', () => {
		const rule = getRuleBySelector(`@at-root      .block {}`, `.block`);
		const result = getRuleContentMeta(rule);

		expect(result).toStrictEqual({
			raw: '@at-root      .block',
			source: '.block',
			offset: 14,
		});
	});

	it('Returns correct meta for `AtRule` without spacing', () => {
		const { root } = postcss().process('@supports(display: grid) {}', { syntax: postcssScss });
		const atRule = root.nodes[0];

		const result = getRuleContentMeta(atRule as AtRule);

		expect(result).toStrictEqual({
			raw: '@supports(display: grid)',
			source: '(display: grid)',
			offset: 9,
		});
	});

	it('Returns correct meta for `AtRule` with comments between name and value', () => {
		const rule = getRuleBySelector(`@at-root /* comment */ .block {}`, `.block`);
		const result = getRuleContentMeta(rule);

		expect(result).toStrictEqual({
			raw: '@at-root /* comment */ .block',
			source: '.block',
			offset: 23,
		});
	});
});
