import { isArray, isNumeric } from '@morev/utils';
import { getRuleBySelector, stringifySelectorNodes } from '#modules/test-utils';
import { resolveSelectorNodes } from './resolve-selector-nodes';
import type { EnrichedNode } from './resolve-selector-nodes.types';

const getSourceMatches = (nodes: EnrichedNode[]) => {
	return nodes.map((node) => node.meta.sourceMatches);
};

describe(resolveSelectorNodes, () => {
	describe('Structure tests', () => {
		it('Source and resolved nodes count is equal if selector is flat', () => {
			const node = getRuleBySelector(`
				.block__element:has(.foo, .bar.is-active):hover::before {}
			`);

			const selectors = resolveSelectorNodes({ node });

			expect(selectors[0].resolvedNodes).toHaveLength(selectors[0].sourceNodes.length);
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

			expect(stringifySelectorNodes(selectors[0].sourceNodes)).toStrictEqual(
				['&', '-title', ':has(.card:hover)'],
			);

			expect(stringifySelectorNodes(selectors[0].resolvedNodes)).toStrictEqual(
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

			const condition = selectors[0].resolvedNodes
				.every((resolvedNode) => isArray(resolvedNode.meta.sourceMatches));

			expect(condition).toBe(true);
		});

		it('All source nodes have `meta` properties', () => {
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

			const condition = selectors[0].sourceNodes
				.every((sourceNode) => {
					return isNumeric(sourceNode.meta.resolvedSourceIndex)
						&& isNumeric(sourceNode.meta.contextOffset);
				});

			expect(condition).toBe(true);
		});
	});

	describe('Meta', () => {
		describe('sourceNodes', () => {
			it('Adjusts source indices without `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							span {}
						}
					}
				`, `span`);
				// .block__element span

				const [{ sourceNodes }] = resolveSelectorNodes({ node });

				expect(sourceNodes).toHaveLength(1);

				expect(sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 16,
					contextOffset: 0,
					sourceOffset: 0,
				});
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
				// .block__element .foo

				const selectors = resolveSelectorNodes({ node });

				expect(selectors).toHaveLength(2);

				expect(selectors[0].sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 16,
					contextOffset: 0,
					sourceOffset: 0,
				});

				expect(selectors[1].sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 16,
					contextOffset: 0,
					sourceOffset: 6,
				});
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

				const selectors = resolveSelectorNodes({ node });

				expect(selectors).toHaveLength(1);

				expect(selectors[0].sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 14,
					contextOffset: 0,
					sourceOffset: 0,
				});

				expect(selectors[0].sourceNodes[1].meta).toStrictEqual({
					resolvedSourceIndex: 15,
					contextOffset: 0,
					sourceOffset: 0,
				});
			});

			it('Adjusts source indices using multiple `&` characters', () => {
				const node = getRuleBySelector(`
					.foo {
						&:hover & & & .bar {}
					}
				`, `&:hover & & & .bar`);

				const [{ sourceNodes }] = resolveSelectorNodes({ node });

				// .foo:hover .foo .foo .bar
				expect(sourceNodes[0].meta).toStrictEqual({ resolvedSourceIndex: 3, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[1].meta).toStrictEqual({ resolvedSourceIndex: 4, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[2].meta).toStrictEqual({ resolvedSourceIndex: 10, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[3].meta).toStrictEqual({ resolvedSourceIndex: 14, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[4].meta).toStrictEqual({ resolvedSourceIndex: 15, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[5].meta).toStrictEqual({ resolvedSourceIndex: 19, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[6].meta).toStrictEqual({ resolvedSourceIndex: 20, contextOffset: 0, sourceOffset: 0 });
				expect(sourceNodes[7].meta).toStrictEqual({ resolvedSourceIndex: 24, contextOffset: 0, sourceOffset: 0 });
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

				const [{ sourceNodes }] = resolveSelectorNodes({ node });

				expect(sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 14,
					contextOffset: 9,
					sourceOffset: 0,
				});

				expect(sourceNodes[1].meta).toStrictEqual({
					resolvedSourceIndex: 15,
					contextOffset: 9,
					sourceOffset: 0,
				});

				expect(sourceNodes[2].meta).toStrictEqual({
					resolvedSourceIndex: 18,
					contextOffset: 9,
					sourceOffset: 0,
				});
			});

			it('Adjusts source indices within `@at-root` without `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							@at-root span    strong {}
						}
					}
				`, `span    strong`);
				// span    strong

				const [{ sourceNodes }] = resolveSelectorNodes({ node });

				expect(sourceNodes[0].meta).toStrictEqual({
					resolvedSourceIndex: 0,
					contextOffset: 9,
					sourceOffset: 0,
				});

				expect(sourceNodes[1].meta).toStrictEqual({
					resolvedSourceIndex: 4,
					contextOffset: 9,
					sourceOffset: 0,
				});

				expect(sourceNodes[2].meta).toStrictEqual({
					resolvedSourceIndex: 8,
					contextOffset: 9,
					sourceOffset: 0,
				});
			});

			it('Adjusts source index using single `&`', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							&:hover {
								.block__bar {
									&-title {}
								}
							}
						}
					}
				`, `&-title`);

				const [{ sourceNodes }] = resolveSelectorNodes({ node });

				expect(sourceNodes).toHaveLength(2);

				// .block__element:hover .block__bar-title
				// &
				expect(sourceNodes[0].meta).toStrictEqual({ resolvedSourceIndex: 32, contextOffset: 0, sourceOffset: 0 });
				// -title
				expect(sourceNodes[1].meta).toStrictEqual({ resolvedSourceIndex: 33, contextOffset: 0, sourceOffset: 0 });
			});

			it('Adjusts source index using `&` in compound selector', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							&:hover {
								.block__bar {
									&-title, span .block {}
								}
							}
						}
					}
				`, `&-title, span .block`);
				// .block__element:hover .block__bar-title,
				// .block__element:hover .block__bar span .block

				const [first, second] = resolveSelectorNodes({ node });

				expect(stringifySelectorNodes(first.sourceNodes)).toStrictEqual(
					['&', '-title'],
				);

				// &
				expect(first.sourceNodes[0].meta)
					.toStrictEqual({ resolvedSourceIndex: 32, contextOffset: 0, sourceOffset: 0 });
				// -title
				expect(first.sourceNodes[1].meta)
					.toStrictEqual({ resolvedSourceIndex: 33, contextOffset: 0, sourceOffset: 0 });

				expect(stringifySelectorNodes(second.sourceNodes)).toStrictEqual(
					['span', ' ', '.block'],
				);

				// span
				expect(second.sourceNodes[0].meta)
					.toStrictEqual({ resolvedSourceIndex: 34, contextOffset: 0, sourceOffset: 9 });
				// ' '
				expect(second.sourceNodes[1].meta)
					.toStrictEqual({ resolvedSourceIndex: 38, contextOffset: 0, sourceOffset: 9 });
				// '.block'
				expect(second.sourceNodes[2].meta)
					.toStrictEqual({ resolvedSourceIndex: 39, contextOffset: 0, sourceOffset: 9 });
			});

			it('Tracks nested `at-root` offsets', () => {
				const node = getRuleBySelector(`
					.block {
						@at-root .foo & {
							@at-root &__foo, &__bar {}
						}
					}
				`, `&__foo, &__bar`);
				// .foo .block__foo
				// .foo .block__bar

				const [first, second] = resolveSelectorNodes({ node });

				expect(stringifySelectorNodes(first.sourceNodes)).toStrictEqual(['&', '__foo']);
				expect(first.sourceNodes[0].meta)
					.toStrictEqual({ resolvedSourceIndex: 10, contextOffset: 9, sourceOffset: 0 });
				expect(first.sourceNodes[1].meta)
					.toStrictEqual({ resolvedSourceIndex: 11, contextOffset: 9, sourceOffset: 0 });


				expect(stringifySelectorNodes(second.sourceNodes)).toStrictEqual(['&', '__bar']);
				expect(second.sourceNodes[0].meta)
					.toStrictEqual({ resolvedSourceIndex: 10, contextOffset: 9, sourceOffset: 8 });
				expect(second.sourceNodes[1].meta)
					.toStrictEqual({ resolvedSourceIndex: 11, contextOffset: 9, sourceOffset: 8 });
			});
		});

		describe('resolvedNodes', () => {
			it('Adjusts source indices without `&` character', () => {
				const node = getRuleBySelector(`
					.block {
						&__element {
							span {}
						}
					}
				`, `span`);
				// .block__element span

				const [{ resolvedNodes }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolvedNodes)).toStrictEqual([
					[],
					[],
					[
						{ value: 'span', sourceRange: [0, 4], resolvedRange: [16, 20], contextOffset: 0, sourceOffset: 0 },
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

				expect(getSourceMatches(first.resolvedNodes)).toStrictEqual([
					[],
					[],
					[
						{ value: 'span', sourceRange: [0, 4], resolvedRange: [16, 20], contextOffset: 0, sourceOffset: 0 },
					],
				]);

				// .block__element .foo
				expect(getSourceMatches(second.resolvedNodes)).toStrictEqual([
					[],
					[],
					[
						{ value: '.foo', sourceRange: [0, 4], resolvedRange: [16, 20], contextOffset: 0, sourceOffset: 6 },
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

				const [{ resolvedNodes }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolvedNodes)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], contextOffset: 0, sourceOffset: 0 }],
					[{ value: ':hover', sourceRange: [1, 7], resolvedRange: [15, 21], contextOffset: 0, sourceOffset: 0 }],
				]);
			});

			it('Adjusts source indices using multiple `&` characters', () => {
				const node = getRuleBySelector(`
					.foo {
						&:hover & & & .bar {}
					}
				`, `&:hover & & & .bar`);

				const [{ resolvedNodes }] = resolveSelectorNodes({ node });

				// .foo:hover .foo .foo .bar
				// &:hover & & & .bar
				expect(getSourceMatches(resolvedNodes)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], sourceOffset: 0, contextOffset: 0 }],
					[{ value: ':hover', sourceRange: [1, 7], resolvedRange: [4, 10], sourceOffset: 0, contextOffset: 0 }],
					[{ value: ' ', sourceRange: [7, 8], resolvedRange: [10, 11], sourceOffset: 0, contextOffset: 0 }],
					[{ value: '&', sourceRange: [8, 9], resolvedRange: [11, 15], sourceOffset: 0, contextOffset: 0 }],
					[{ value: ' ', sourceRange: [9, 10], resolvedRange: [15, 16], sourceOffset: 0, contextOffset: 0 }],
					[{ value: '&', sourceRange: [10, 11], resolvedRange: [16, 20], sourceOffset: 0, contextOffset: 0 }],
					[{ value: ' ', sourceRange: [11, 12], resolvedRange: [20, 21], sourceOffset: 0, contextOffset: 0 }],
					[{ value: '&', sourceRange: [12, 13], resolvedRange: [21, 25], sourceOffset: 0, contextOffset: 0 }],
					[{ value: ' ', sourceRange: [13, 14], resolvedRange: [25, 26], sourceOffset: 0, contextOffset: 0 }],
					[{ value: '.bar', sourceRange: [14, 18], resolvedRange: [26, 30], sourceOffset: 0, contextOffset: 0 }],
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

				const [{ resolvedNodes }] = resolveSelectorNodes({ node });

				expect(getSourceMatches(resolvedNodes)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], sourceOffset: 0, contextOffset: 9 }],
					[{ value: '   ', sourceRange: [1, 4], resolvedRange: [15, 18], sourceOffset: 0, contextOffset: 9 }],
					[{ value: 'span', sourceRange: [4, 8], resolvedRange: [18, 22], sourceOffset: 0, contextOffset: 9 }],
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
				expect(getSourceMatches(first.resolvedNodes)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 15], sourceOffset: 0, contextOffset: 0 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [15, 16], sourceOffset: 0, contextOffset: 0 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [16, 27], sourceOffset: 0, contextOffset: 0 },
						{ value: '-title', sourceRange: [1, 7], resolvedRange: [27, 33], sourceOffset: 0, contextOffset: 0 },
					],
				]);

				// .block__element .block__bar span .block
				expect(getSourceMatches(second.resolvedNodes)).toStrictEqual([
					[], // '.block__element'
					[], // ' '
					[], // '.block__bar'
					[], // ' '
					[{ value: 'span', sourceRange: [0, 4], resolvedRange: [28, 32], sourceOffset: 9, contextOffset: 0 }],
					[{ value: ' ', sourceRange: [4, 5], resolvedRange: [32, 33], sourceOffset: 9, contextOffset: 0 }],
					[{ value: '.block', sourceRange: [5, 11], resolvedRange: [33, 39], sourceOffset: 9, contextOffset: 0 }],
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
				expect(getSourceMatches(first.resolvedNodes)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], sourceOffset: 0, contextOffset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [4, 5], sourceOffset: 0, contextOffset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [5, 11], sourceOffset: 0, contextOffset: 9 },
						{ value: '__foo', sourceRange: [1, 6], resolvedRange: [11, 16], sourceOffset: 0, contextOffset: 9 },
					],
				]);

				// .foo .block__bar
				expect(getSourceMatches(second.resolvedNodes)).toStrictEqual([
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 4], sourceOffset: 8, contextOffset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [4, 5], sourceOffset: 8, contextOffset: 9 },
					],
					[
						{ value: '&', sourceRange: [0, 1], resolvedRange: [5, 11], sourceOffset: 8, contextOffset: 9 },
						{ value: '__bar', sourceRange: [1, 6], resolvedRange: [11, 16], sourceOffset: 8, contextOffset: 9 },
					],
				]);
			});

			it('Properly calculates offset within :pseudo classes', () => {
				const node = getRuleBySelector(`
					.block {
						@at-root &:has(&__foo, span.bar &__baz:is(&--foo)) {}
					}
				`, `&:has(&__foo, span.bar &__baz:is(&--foo))`);


				const [{ resolvedNodes }] = resolveSelectorNodes({ node });

				// &:has(&__foo, span.bar &__baz:is(&--foo))
				// .block:has(.block__foo, span.bar .block__baz:is(.block--foo))
				expect(getSourceMatches(resolvedNodes)).toStrictEqual([
					[{ value: '&', sourceRange: [0, 1], resolvedRange: [0, 6], sourceOffset: 0, contextOffset: 9 }],
					[{ value: ':has(&__foo, span.bar &__baz:is(&--foo))', sourceRange: [1, 41], resolvedRange: [6, 61], sourceOffset: 0, contextOffset: 9 }],
				]);

				// @ts-expect-error -- Trust me this is `Pseudo.nodes`
				const firstPseudo = resolvedNodes[1].nodes;

				// &:has(&__foo, span.bar &__baz:is(&--foo))
				// .block:has(.block__foo, span.bar .block__baz:is(.block--foo))
				expect(getSourceMatches(firstPseudo)).toStrictEqual([
					[
						// .block__foo
						[
							{ value: '&', sourceRange: [6, 7], resolvedRange: [11, 17], sourceOffset: 0, contextOffset: 9 },
							{ value: '__foo', sourceRange: [7, 12], resolvedRange: [17, 22], sourceOffset: 0, contextOffset: 9 },
						],
					],
					[
						[{ value: 'span', sourceRange: [14, 18], resolvedRange: [24, 28], sourceOffset: 0, contextOffset: 9 }],
						[{ value: '.bar', sourceRange: [18, 22], resolvedRange: [28, 32], sourceOffset: 0, contextOffset: 9 }],
						[{ value: ' ', sourceRange: [22, 23], resolvedRange: [32, 33], sourceOffset: 0, contextOffset: 9 }],
						// .block__baz
						[
							{ value: '&', sourceRange: [23, 24], resolvedRange: [33, 39], sourceOffset: 0, contextOffset: 9 },
							{ value: '__baz', sourceRange: [24, 29], resolvedRange: [39, 44], sourceOffset: 0, contextOffset: 9 },
						],
						// :is(.block--foo)
						[
							{ value: ':is(&--foo)', sourceRange: [29, 40], resolvedRange: [44, 60], sourceOffset: 0, contextOffset: 9 },
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
							{ value: '&', sourceRange: [33, 34], resolvedRange: [48, 53], sourceOffset: 0, contextOffset: 9 },
							{ value: '--foo', sourceRange: [34, 39], resolvedRange: [48, 59], sourceOffset: 0, contextOffset: 9 },
						],
					],
				]);
			});
		});
	});
});
