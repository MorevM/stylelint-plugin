import { getRuleBySelector } from '#modules/test-utils';
import { isPureAtRule } from './is-pure-at-rule';
import type { AtRule } from 'postcss';

describe(isPureAtRule, () => {
	it('Returns `true` for an empty at-rule', () => {
		const at = getRuleBySelector<AtRule>('@media (min-width: 768px) {}');

		expect(isPureAtRule(at)).toBe(true);
	});

	it('Returns `true` for an at-rule containing only empty nested at-rules', () => {
		const at = getRuleBySelector<AtRule>(`
			@supports (display: grid) {
				@media (min-width: 768px) {
					@layer utilities {}
				}
				@layer utilities {}
			}
		`);

		expect(isPureAtRule(at)).toBe(true);
	});

	it('Returns `true` for at-rules that contain only declarations (e.g., `@font-face`)', () => {
		const at = getRuleBySelector<AtRule>(`
			@font-face {
				font-family: Test;
				src: url(test.woff2) format('woff2');
				font-weight: 400;
				font-style: normal;
			}
		`);

		expect(isPureAtRule(at)).toBe(true);
	});

	it('Returns `false` when a direct child `Rule` is present', () => {
		const at = getRuleBySelector<AtRule>(`
			@media (min-width: 768px) {
				.foo { color: red; }
			}
		`);

		expect(isPureAtRule(at)).toBe(false);
	});

	it('Returns `false` when a nested at-rule contains a `Rule` deep inside', () => {
		const at = getRuleBySelector<AtRule>(`
			@supports (display: grid) {
				@media (min-width: 768px) {
					.foo { color: red; }
				}
			}
		`);

		expect(isPureAtRule(at)).toBe(false);
	});

	it('Ignores comments and returns `true` if there are no `Rule` nodes', () => {
		const at = getRuleBySelector<AtRule>(`
			@media (min-width: 768px) {
				/* comment */
				@layer components {}
				/* another comment */
			}
		`);

		expect(isPureAtRule(at)).toBe(true);
	});

	it('Handles at-rules without `nodes` safely (returns `true`)', () => {
		const at = getRuleBySelector<AtRule>('@supports (display: grid) {}');

		expect(isPureAtRule(at)).toBe(true);
	});
});
