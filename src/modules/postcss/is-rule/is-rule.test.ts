import { isRule } from './is-rule';
import type { AtRule, Declaration, Rule } from 'postcss';

const createAtRule = (): AtRule =>
	({ type: 'atrule' } as AtRule);

const createDecl = (): Declaration =>
	({ type: 'decl', prop: 'color', value: 'red' } as Declaration);

const createRule = (): Rule =>
	({ type: 'rule', selector: '.foo' } as Rule);

describe(isRule, () => {
	it('Returns `false` for non-`Rule` nodes', () => {
		expect(isRule(createDecl())).toBe(false);
		expect(isRule(createAtRule())).toBe(false);
	});

	it('Returns `false` for `undefined` input', () => {
		expect(isRule(undefined)).toBe(false);
	});

	it('Returns `true` for `Rule` node', () => {
		expect(isRule(createRule())).toBe(true);
	});
});
