import { isArray } from '@morev/utils';
import { getRuleBySelector, stringifySelectorNodes } from '#modules/test-utils';
import { resolveSelectorNodes } from './resolve-selector-nodes';
import type { ResolvedNode } from './resolve-selector-nodes.types';

const getSourceMatches = (nodes: ResolvedNode[]) => {
	return nodes.map((node) => node.meta.sourceMatches);
};

describe(resolveSelectorNodes, () => {
	describe('Common mechanics, edge cases', () => {
		it('Does not validate incomplete/invalid input', () => {
			const node = getRuleBySelector(`
				.bar-component {
					@at-root /
				}
			`, '/');

			const selectors = resolveSelectorNodes({ node });

			expect(selectors).toHaveLength(0);
		});
	});

	describe('Structure tests', () => {
		it('Source and resolved nodes count is equal if selector is flat', () => {
			const node = getRuleBySelector(`
				.block__element:has(.foo, .bar.is-active):hover::before {}
			`);

			const selectors = resolveSelectorNodes({ node });

			expect(selectors[0].resolved).toHaveLength(selectors[0].source.length);
		});

		it('Resolves all selector branches at once', () => {
			const node = getRuleBySelector(`
				.block {
					&__foo, &__bar { // 2
						&:hover, span, &-title {} // 3
					}
				}
			`, `&:hover, span, &-title`);

			const selectors = resolveSelectorNodes({ node });

			expect(selectors).toHaveLength(2 * 3);
		});

		it('Correctly resolves selectors', () => {
			const node = getRuleBySelector(`
				.foo .block {
					&__element {
						&:hover {
							.block__bar {
								&-title:has(.card:hover) {}
							}
						}
					}
				}
			`, `&-title:has(.card:hover)`);

			const selectors = resolveSelectorNodes({ node });

			expect(stringifySelectorNodes(selectors[0].source)).toStrictEqual(
				['&', '-title', ':has(.card:hover)'],
			);

			expect(stringifySelectorNodes(selectors[0].resolved)).toStrictEqual(
				['.foo', ' ', '.block__element', ':hover', ' ', '.block__bar-title', ':has(.card:hover)'],
			);
		});

		it('All resolved nodes have `meta.sourceMatches` property', () => {
			const node = getRuleBySelector(`
				.foo .block {
					&__element {
						&:hover {
							.block__bar {
								&-title:has(.card:hover) {}
							}
						}
					}
				}
			`, `&-title:has(.card:hover)`);

			const selectors = resolveSelectorNodes({ node });

			const condition = selectors[0].resolved
				.every((resolvedNode) => isArray(resolvedNode.meta.sourceMatches));

			expect(condition).toBe(true);
		});
	});

	describe('Meta', () => {
		describe('resolved', () => {
			it('Properly determines ranges of non-space combinators', () => {
				const node = getRuleBySelector(`
					.block > a {}
				`);

				const [{ resolved }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolved)).toStrictEqual([
					[
						{ value: '.block', sourceRange: [0, 6], resolvedRange: [0, 6], offset: 0 },
					],
					[
						{ value: '>', sourceRange: [7, 8], resolvedRange: [7, 8], offset: 0 },
					],
					[
						{ value: 'a', sourceRange: [9, 10], resolvedRange: [9, 10], offset: 0 },
					],
				]);
			});

			it('Keeps space-only combinators', () => {
				const node = getRuleBySelector(`
					.block a {}
				`);

				const [{ resolved }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolved)).toStrictEqual([
					[
						{ value: '.block', sourceRange: [0, 6], resolvedRange: [0, 6], offset: 0 },
					],
					[
						{ value: ' ', sourceRange: [6, 7], resolvedRange: [6, 7], offset: 0 },
					],
					[
						{ value: 'a', sourceRange: [7, 8], resolvedRange: [7, 8], offset: 0 },
					],
				]);
			});

			it('Adjusts source indices without `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							span {}
						}
					}
				`, `span`);
				// .block__element span

				const [{ resolved }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolved)).toStrictEqual([
					[],
					[],
					[
						{ value: 'span', sourceRange: [0, 4], resolvedRange: [16, 20], offset: 0 },
					],
				]);
			});

			it('Adjusts source indices without `&` character in case of compound selector', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							span, .foo {}
						}
					}
				`, `span, .foo`);
				// .block__element span

				const [first, second] = resolveSelectorNodes({ node });

				expect(getSourceMatches(first.resolved)).toStrictEqual([
					[],
					[],
					[
						{ value: 'span', sourceRange: [0, 4], resolvedRange: [16, 20], offset: 0 },
					],
				]);

				// .block__element .foo
				expect(getSourceMatches(second.resolved)).toStrictEqual([
					[],
					[],
					[
						{ value: '.foo', sourceRange: [0, 4], resolvedRange: [16, 20], offset: 6 },
					],
				]);
			});

			it('Adjusts source indices using `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							&:hover {}
						}
					}
				`, `&:hover`);
				// .block__element:hover

				const [{ resolved }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolved)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], offset: 0 }],
					[{ value: ':hover', sourceRange: [1, 7], resolvedRange: [15, 21], offset: 0 }],
				]);
			});

			it('Adjusts source indices using multiple `&` characters', () => {
				const node = getRuleBySelector(`
					.foo {
						&:hover & & & .bar {}
					}
				`, `&:hover & & & .bar`);

				const [{ resolved }] = resolveSelectorNodes({ node });

				// .foo:hover .foo .foo .bar
				// &:hover & & & .bar
				expect(getSourceMatches(resolved)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], offset: 0 }],
					[{ value: ':hover', sourceRange: [1, 7], resolvedRange: [4, 10], offset: 0 }],
					[{ value: ' ', sourceRange: [7, 8], resolvedRange: [10, 11], offset: 0 }],
					[{ value: '&', sourceRange: [8, 9], resolvedRange: [11, 15], offset: 0 }],
					[{ value: ' ', sourceRange: [9, 10], resolvedRange: [15, 16], offset: 0 }],
					[{ value: '&', sourceRange: [10, 11], resolvedRange: [16, 20], offset: 0 }],
					[{ value: ' ', sourceRange: [11, 12], resolvedRange: [20, 21], offset: 0 }],
					[{ value: '&', sourceRange: [12, 13], resolvedRange: [21, 25], offset: 0 }],
					[{ value: ' ', sourceRange: [13, 14], resolvedRange: [25, 26], offset: 0 }],
					[{ value: '.bar', sourceRange: [14, 18], resolvedRange: [26, 30], offset: 0 }],
				]);
			});

			it('Adjusts source indices within `@at-root` using `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							@at-root &   span {}
						}
					}
				`, `&   span`);
				// .block__element   span

				const [{ resolved }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolved)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], offset: 9 }],
					[{ value: '   ', sourceRange: [1, 4], resolvedRange: [15, 18], offset: 9 }],
					[{ value: 'span', sourceRange: [4, 8], resolvedRange: [18, 22], offset: 9 }],
				]);
			});

			it('Adjusts source ranges after resolved SASS variables', () => {
				const code = `
					.the-component {
						$b: #{&};
						$link: #{$b}__link;

						@at-root #{$b} .foreign {}
						@at-root #{$link}--active span {}

						&__element {
							#{$link}--disabled strong {}
						}
					}
				`;

				const firstNode = getRuleBySelector(code, '#{$b} .foreign');
				const secondNode = getRuleBySelector(code, '#{$link}--active span');
				const thirdNode = getRuleBySelector(code, '#{$link}--disabled strong');
				const [{ resolved: firstResolved }] = resolveSelectorNodes({ node: firstNode });
				const [{ resolved: secondResolved }] = resolveSelectorNodes({ node: secondNode });
				const [{ resolved: thirdResolved }] = resolveSelectorNodes({ node: thirdNode });

				// .the-component .foreign
				expect(getSourceMatches(firstResolved)).toStrictEqual([
					[{
						value: '#{$b}',
						sourceRange: [0, 5], resolvedRange: [0, 14],
						offset: 9,
					}],
					[{
						value: ' ',
						sourceRange: [5, 6], resolvedRange: [14, 15],
						offset: 9,
					}],
					[{
						value: '.foreign',
						sourceRange: [6, 14], resolvedRange: [15, 23],
						offset: 9,
					}],
				]);

				// .the-component__link--active span
				expect(getSourceMatches(secondResolved)).toStrictEqual([
					[{
						value: '#{$link}--active',
						sourceRange: [0, 16], resolvedRange: [0, 28],
						offset: 9,
					}],
					[{
						value: ' ',
						sourceRange: [16, 17], resolvedRange: [28, 29],
						offset: 9,
					}],
					[{
						value: 'span',
						sourceRange: [17, 21], resolvedRange: [29, 33],
						offset: 9,
					}],
				]);

				// .the-component__element .the-component__link--disabled strong
				expect(getSourceMatches(thirdResolved)).toStrictEqual([
					[],
					[],
					[{
						value: '#{$link}--disabled',
						sourceRange: [0, 18], resolvedRange: [24, 54],
						offset: 0,
					}],
					[{
						value: ' ',
						sourceRange: [18, 19], resolvedRange: [54, 55],
						offset: 0,
					}],
					[{
						value: 'strong',
						sourceRange: [19, 25], resolvedRange: [55, 61],
						offset: 0,
					}],
				]);
			});

			it('Adjusts source index using `&` in compound selector', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							.block__bar {
								&-title, span .block {}
							}
						}
					}
				`, `&-title, span .block`);

				const [first, second] = resolveSelectorNodes({ node });

				// .block__element .block__bar-title,
				expect(getSourceMatches(first.resolved)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], offset: 0 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [15, 16], offset: 0 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [16, 27], offset: 0 },
						{ value: '-title', sourceRange: [1, 7], resolvedRange: [27, 33], offset: 0 },
					],
				]);

				// .block__element .block__bar span .block
				expect(getSourceMatches(second.resolved)).toStrictEqual([
					[], // '.block__element'
					[], // ' '
					[], // '.block__bar'
					[], // ' '
					[{ value: 'span', sourceRange: [0, 4], resolvedRange: [28, 32], offset: 9 }],
					[{ value: ' ', sourceRange: [4, 5], resolvedRange: [32, 33], offset: 9 }],
					[{ value: '.block', sourceRange: [5, 11], resolvedRange: [33, 39], offset: 9 }],
				]);
			});

			it('Tracks nested `at-root` offsets', () => {
				const node = getRuleBySelector(`
					.block {
						@at-root .foo & {
							@at-root &__foo, &__bar {}
						}
					}
				`, `&__foo, &__bar`);
				// .foo .block__bar

				const [first, second] = resolveSelectorNodes({ node });

				// .foo .block__foo
				expect(getSourceMatches(first.resolved)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], offset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [4, 5], offset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [5, 11], offset: 9 },
						{ value: '__foo', sourceRange: [1, 6], resolvedRange: [11, 16], offset: 9 },
					],
				]);

				// .foo .block__bar
				expect(getSourceMatches(second.resolved)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], offset: 17 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [4, 5], offset: 17 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [5, 11], offset: 17 },
						{ value: '__bar', sourceRange: [1, 6], resolvedRange: [11, 16], offset: 17 },
					],
				]);
			});

			it('Properly calculates offset within :pseudo classes', () => {
				const node = getRuleBySelector(`
					.block {
						@at-root &:has(&__foo, span.bar &__baz:is(&--foo)) {}
					}
				`, `&:has(&__foo, span.bar &__baz:is(&--foo))`);


				const [{ resolved }] = resolveSelectorNodes({ node });

				// &:has(&__foo, span.bar &__baz:is(&--foo))
				// .block:has(.block__foo, span.bar .block__baz:is(.block--foo))
				expect(getSourceMatches(resolved)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 6], offset: 9 }],
					[{ value: ':has(&__foo, span.bar &__baz:is(&--foo))', sourceRange: [1, 41], resolvedRange: [6, 61], offset: 9 }],
				]);

				// @ts-expect-error -- Trust me this is `Pseudo.nodes`
				const firstPseudo = resolved[1].nodes;

				// &:has(&__foo, span.bar &__baz:is(&--foo))
				// .block:has(.block__foo, span.bar .block__baz:is(.block--foo))
				expect(getSourceMatches(firstPseudo)).toStrictEqual([
					[
						// .block__foo
						[
							{ value: '&', sourceRange: [6, 7], resolvedRange: [11, 17], offset: 9 },
							{ value: '__foo', sourceRange: [7, 12], resolvedRange: [17, 22], offset: 9 },
						],
					],
					[
						[{ value: 'span', sourceRange: [14, 18], resolvedRange: [24, 28], offset: 9 }],
						[{ value: '.bar', sourceRange: [18, 22], resolvedRange: [28, 32], offset: 9 }],
						[{ value: ' ', sourceRange: [22, 23], resolvedRange: [32, 33], offset: 9 }],
						// .block__baz
						[
							{ value: '&', sourceRange: [23, 24], resolvedRange: [33, 39], offset: 9 },
							{ value: '__baz', sourceRange: [24, 29], resolvedRange: [39, 44], offset: 9 },
						],
						// :is(.block--foo)
						[
							{ value: ':is(&--foo)', sourceRange: [29, 40], resolvedRange: [44, 60], offset: 9 },
						],
					],
				]);

				const innerPseudo = firstPseudo[1].nodes[4];


				// &:has(&__foo, span.bar &__baz:is(&--foo))
				// .block:has(.block__foo, span.bar .block__baz:is(.block--foo))
				expect(getSourceMatches(innerPseudo)).toStrictEqual([
					[
						// .block--foo
						[
							{ value: '&', sourceRange: [33, 34], resolvedRange: [48, 54], offset: 9 },
							{ value: '--foo', sourceRange: [34, 39], resolvedRange: [54, 59], offset: 9 },
						],
					],
				]);
			});
		});
	});
});
