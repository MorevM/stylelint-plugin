import { getRuleBySelector } from '#modules/test-utils';
import { getRuleDeclarations } from './get-rule-declarations';
import type { Rule } from 'postcss';

describe(getRuleDeclarations, () => {
	it('Returns all declarations by default', () => {
		const rule = getRuleBySelector<Rule>(`
			.foo {
				color: red;
				@media (min-width: 600px) {
					margin: 10px;
				}
				.bar {
					padding: 5px;
				}
			}
		`);

		const decls = getRuleDeclarations(rule);

		expect(decls.map((d) => d.prop)).toStrictEqual(['color', 'margin', 'padding']);
	});

	it('Returns only direct child declarations when `onlyDirectChildren` is `true`', () => {
		const rule = getRuleBySelector<Rule>(`
			.foo {
				color: red;
				@media (min-width: 600px) {
					margin: 10px;
				}
				.bar {
					padding: 5px;
				}
			}
		`);

		const decls = getRuleDeclarations(rule, { onlyDirectChildren: true });

		expect(decls.map((d) => d.prop)).toStrictEqual(['color']);
	});

	it('Handles empty rules gracefully', () => {
		const rule = getRuleBySelector<Rule>(`.foo {}`);
		const decls = getRuleDeclarations(rule);

		expect(decls).toStrictEqual([]);
	});

	it('Collects multiple direct children', () => {
		const rule = getRuleBySelector<Rule>(`
			.foo {
				color: red;
				background: blue;
				border: 1px solid black;
			}
		`);

		const decls = getRuleDeclarations(rule, { onlyDirectChildren: true });

		expect(decls.map((d) => d.prop)).toStrictEqual(['color', 'background', 'border']);
	});
});
