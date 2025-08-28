import { getRuleBySelector } from '#modules/test-utils';
import { collectDeclarationsWithPath } from './collect-declarations-with-path';
import type { AtRule } from 'postcss';

describe(collectDeclarationsWithPath, () => {
	it('Returns an empty array for an empty pure at-rule', () => {
		const atRule = getRuleBySelector<AtRule>('@media (min-width: 768px) {}');
		const result = collectDeclarationsWithPath(atRule);

		expect(result).toStrictEqual([]);
	});

	it('Skips empty nested at-rules and still returns an empty array when no declarations exist', () => {
		const at = getRuleBySelector<AtRule>(`
			@media (min-width: 768px) {
				@supports (display: grid) {}
				@layer utilities {}
			}
		`);

		const result = collectDeclarationsWithPath(at);

		expect(result).toStrictEqual([]);
	});

	it('Collects direct declarations with path containing only the root at-rule', () => {
		const atRule = getRuleBySelector<AtRule>(`
			@font-face {
				font-family: Test;
				src: url(foo.woff2) format('woff2');
			}
		`);

		const result = collectDeclarationsWithPath(atRule);

		expect(result).toHaveLength(2);

		expect(result.map((entry) => entry.declaration.prop))
			.toStrictEqual(['font-family', 'src']);

		for (const item of result) {
			expect(item.atRulePath).toHaveLength(1);
			expect(item.atRulePath[0].name).toBe('font-face');
		}
	});

	it('Collects declarations nested inside inner at-rules and preserves the path', () => {
		const atRule = getRuleBySelector<AtRule>(`
			@media (min-width: 768px) {
				@supports (display: grid) {
					color: red;
					background: blue;
				}
			}
		`);

		const result = collectDeclarationsWithPath(atRule);

		expect(result).toHaveLength(2);

		const color = result.find((x) => x.declaration.prop === 'color');

		expect(color).toBeTruthy();
		expect(color!.atRulePath.map((a) => a.name)).toStrictEqual(['media', 'supports']);

		const bg = result.find((x) => x.declaration.prop === 'background');

		expect(bg).toBeTruthy();
		expect(bg!.atRulePath.map((a) => a.name)).toStrictEqual(['media', 'supports']);
	});

	it('Collects declarations across multiple branches (order agnostic) with correct **paths**', () => {
		const at = getRuleBySelector<AtRule>(`
			@media (min-width: 768px) {
				@supports (display: grid) {
					color: red;
				}

				@layer components {
					@supports (display: contents) {
						margin: 0;
					}
				}

				opacity: .9;
			}
		`);

		const result = collectDeclarationsWithPath(at);

		expect(result).toHaveLength(3);

		const color = result.find((x) => x.declaration.prop === 'color');

		expect(color).toBeTruthy();
		expect(color!.atRulePath.map((a) => a.name)).toStrictEqual(['media', 'supports']);

		const margin = result.find((x) => x.declaration.prop === 'margin');

		expect(margin).toBeTruthy();
		expect(margin!.atRulePath.map((a) => a.name)).toStrictEqual(['media', 'layer', 'supports']);

		const opacity = result.find((x) => x.declaration.prop === 'opacity');

		expect(opacity).toBeTruthy();
		expect(opacity!.atRulePath.map((a) => a.name)).toStrictEqual(['media']);
	});
});
