import { stripIndent } from '@morev/utils';
import stylelint from 'stylelint';
import { createDisabledRangeChecker } from './create-disabled-range-checker';
import type { Rule } from 'stylelint';

describe(createDisabledRangeChecker, () => {
	const ruleName = 'test/disabled-ranges';
	const code = stripIndent(`
		.global {
			/* stylelint-disable */
			color: red;
			/* stylelint-enable */
		}
		/* stylelint-disable-next-line ${ruleName} */
		.own { color: red; }
		/* stylelint-disable-next-line block-no-empty */
		.other { color: red; }
		/* stylelint-disable ${ruleName} */
		.open { color: red; }
	`);

	const checkRules = async (ignoreDisables = false) => {
		const checked: Array<[string, boolean]> = [];
		const check: ReturnType<Rule> = (root, result) => {
			const isDisabled = createDisabledRangeChecker(result.stylelint, ruleName);
			root.walkRules((node) => { checked.push([node.selector, isDisabled(node)]); });
		};
		const rule: Rule = () => check;
		rule.ruleName = ruleName;
		rule.messages = {};

		const result = await stylelint.lint({
			code,
			config: {
				plugins: [stylelint.createPlugin(ruleName, rule)],
				rules: { [ruleName]: true, 'block-no-empty': true },
				ignoreDisables,
			},
		});

		expect(result.errored).toBe(false);

		return checked;
	};

	it('Checks partial, single-line and open overlaps with global and own-rule ranges', async () => {
		await expect(checkRules()).resolves.toStrictEqual([
			['.global', true],
			['.own', true],
			['.other', false],
			['.open', true],
		]);
	});

	it('Honors ignoreDisables for both global and own-rule ranges', async () => {
		await expect(checkRules(true)).resolves.toStrictEqual([
			['.global', false],
			['.own', false],
			['.other', false],
			['.open', false],
		]);
	});
});
