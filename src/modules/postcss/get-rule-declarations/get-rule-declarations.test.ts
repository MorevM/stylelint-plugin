import { getRuleBySelector } from '#modules/test-utils';
import { getRuleDeclarations } from './get-rule-declarations';
import type { Rule } from 'postcss';

describe(getRuleDeclarations, () => {
	it('Handles empty rules gracefully', () => {
		const rule = getRuleBySelector<Rule>(`.foo {}`);
		const decls = getRuleDeclarations(rule);

		expect(decls).toStrictEqual([]);
	});

	describe('Mode: deep (default)', () => {
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
	});

	describe('Mode: direct', () => {
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

			const decls = getRuleDeclarations(rule, { mode: 'direct' });

			expect(decls.map((d) => d.prop)).toStrictEqual(['color']);
		});

		it('Collects multiple direct children', () => {
			const rule = getRuleBySelector<Rule>(`
				.foo {
					color: red;
					background: blue;
					border: 1px solid black;
				}
			`);

			const decls = getRuleDeclarations(rule, { mode: 'direct' });

			expect(decls.map((d) => d.prop)).toStrictEqual(['color', 'background', 'border']);
		});
	});

	describe('Mode: directWithPureAtRules', () => {
		it('Returns direct declarations + declarations from pure at-rules (default `shape: "nodes"`) ', () => {
			const rule = getRuleBySelector<Rule>(`
				.foo {
					color: red;

					@font-face {
						font-family: Test;
						src: url(foo.woff2) format('woff2');
					}

					@supports (display: grid) {
						opacity: .9;
					}

					@media (min-width: 600px) {
						.bar { margin: 10px; }
					}
				}
			`);

			const decls = getRuleDeclarations(rule, { mode: 'directWithPureAtRules' });

			expect(decls.map((d) => d.prop)).toStrictEqual([
				'color', // direct
				'font-family', // from @font-face
				'src', // from @font-face
				'opacity', // from @supports
				// no 'margin' because @media contains a Rule
			]);
		});

		it('Returns with path when `shape: "withPath"`', () => {
			const rule = getRuleBySelector<Rule>(`
				.foo {
					background: blue;

					@font-face {
						font-family: Test;
					}

					@supports (display: grid) {
						opacity: .9;
					}

					@layer components {
						@supports (display: contents) {
							outline: 1px solid red;
						}
					}

					@media (min-width: 600px) {
						.bar { padding: 5px; }
					}
				}
			`);

			const declsWithPath = getRuleDeclarations(rule, {
				mode: 'directWithPureAtRules',
				shape: 'withPath',
			});

			// 1 direct + 1 (font-face) + 1 (supports) + 1 (layer-supports) = 4
			expect(declsWithPath).toHaveLength(4);

			// Direct declaration has an empty path
			const direct = declsWithPath.find((x) => x.declaration.prop === 'background')!;

			expect(direct).toBeTruthy();
			expect(direct.atRulePath).toStrictEqual([]);

			// @font-face → path = ['font-face']
			const ff = declsWithPath.find((x) => x.declaration.prop === 'font-family')!;

			expect(ff).toBeTruthy();
			expect(ff.atRulePath.map((a) => a.name)).toStrictEqual(['font-face']);

			// @supports → path = ['supports']
			const op = declsWithPath.find((x) => x.declaration.prop === 'opacity')!;

			expect(op).toBeTruthy();
			expect(op.atRulePath.map((a) => a.name)).toStrictEqual(['supports']);

			// @layer → @supports → path = ['layer', 'supports']
			const outline = declsWithPath.find((x) => x.declaration.prop === 'outline')!;

			expect(outline).toBeTruthy();
			expect(outline.atRulePath.map((a) => a.name)).toStrictEqual(['layer', 'supports']);

			// Ensure non-pure @media branch didn't leak declarations
			expect(declsWithPath.find((x) => x.declaration.prop === 'padding')).toBeUndefined();
		});
	});
});
