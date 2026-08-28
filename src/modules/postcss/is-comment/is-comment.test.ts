import postcss from 'postcss';
import { isComment } from './is-comment';
import type { Rule } from 'postcss';

describe(isComment, () => {
	it('Recognizes a comment node', () => {
		const root = postcss.parse(`
			/* Note */
			.block {}
		`);

		expect(isComment(root.first)).toBe(true);
	});

	it('Rejects non-comment nodes', () => {
		const root = postcss.parse(`
			.block {
				color: red;
			}
		`);
		const rule = root.first as Rule;

		expect(isComment(root)).toBe(false);
		expect(isComment(rule)).toBe(false);
		expect(isComment(rule.first)).toBe(false);
	});

	it('Rejects an undefined node', () => {
		expect(isComment(undefined)).toBe(false);
	});
});
