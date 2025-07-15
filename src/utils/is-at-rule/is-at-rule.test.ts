import { isAtRule } from './is-at-rule';
import type { AtRule, Declaration } from 'postcss';

const createAtRule = (name: string): AtRule =>
	({ type: 'atrule', name } as AtRule);

const createDecl = (): Declaration =>
	({ type: 'decl', prop: 'color', value: 'red' } as Declaration);

describe(isAtRule, () => {
	describe('Without `atRuleNames` filter', () => {
		it('Returns `false` for non-`AtRule` nodes', () => {
			expect(isAtRule(createDecl())).toBe(false);
		});

		it('Returns `true` for `AtRule` when no `atRuleNames` provided', () => {
			expect(isAtRule(createAtRule('media'))).toBe(true);
			expect(isAtRule(createAtRule('media'), undefined)).toBe(true);
		});

		it('Returns `true` for `AtRule` when empty `atRuleNames` list provided', () => {
			expect(isAtRule(createAtRule('supports'), [])).toBe(true);
		});
	});

	describe('With `atRuleNames` filter', () => {
		it('Returns `true` when `AtRule` name matches one of the provided `atRuleNames`', () => {
			expect(isAtRule(createAtRule('media'), ['media', 'supports'])).toBe(true);
		});

		it('Returns `false` when `AtRule` name does not match any of the provided `atRuleNames`', () => {
			expect(isAtRule(createAtRule('keyframes'), ['media', 'supports'])).toBe(false);
		});
	});
});
