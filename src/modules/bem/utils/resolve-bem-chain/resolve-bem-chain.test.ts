import { DEFAULT_SEPARATORS } from '#modules/bem';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveBemChain } from './resolve-bem-chain';
import type { BemChain } from './resolve-bem-chain.types';

const separators = DEFAULT_SEPARATORS;

const simplifyChains = (chains: BemChain[]) => {
	return chains.map((chainItem) => {
		return chainItem.map((item) => {
			return {
				type: item.type,
				selector: item.selector,
			};
		});
	});
};

describe(resolveBemChain, () => {
	it('Returns empty array for a non-BEM input', () => {
		const rule = getRuleBySelector(`
			span {}
		`, 'span');

		const result = resolveBemChain(rule, separators);

		expect(result).toStrictEqual([]);
	});

	it('Resolves single BEM block', () => {
		const rule = getRuleBySelector(`
			.block {}
		`, '.block');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves simple BEM chain', () => {
		const rule = getRuleBySelector(`
			.block {
				&__element {
					&--modifier-name {
						&--modifier-value {}
					}
				}
			}
		`, '&--modifier-value');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierValue', selector: '.block__element--modifier-name--modifier-value' },
				{ type: 'modifierName', selector: '.block__element--modifier-name' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves BEM chain with repeated entities', () => {
		const rule = getRuleBySelector(`
			.block {
				&-foo {
					&__element {
						&-foo {
							&--modifier-name {
								&-foo {
									&--modifier-value {
										&-bar {}
									}
								}
							}
						}
					}
				}
			}
		`, '&-bar');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierValue', selector: '.block-foo__element-foo--modifier-name-foo--modifier-value-bar' },
				{ type: 'modifierValue', selector: '.block-foo__element-foo--modifier-name-foo--modifier-value' },
				{ type: 'modifierName', selector: '.block-foo__element-foo--modifier-name-foo' },
				{ type: 'modifierName', selector: '.block-foo__element-foo--modifier-name' },
				{ type: 'element', selector: '.block-foo__element-foo' },
				{ type: 'element', selector: '.block-foo__element' },
				{ type: 'block', selector: '.block-foo' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves BEM chain with compound selector at the last position', () => {
		const rule = getRuleBySelector(`
			.block {
				&__element {
					&--name {
						&--value, &--foo {}
					}
				}
			}
		`, '&--value, &--foo');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierValue', selector: '.block__element--name--value' },
				{ type: 'modifierName', selector: '.block__element--name' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
			[
				{ type: 'modifierValue', selector: '.block__element--name--foo' },
				{ type: 'modifierName', selector: '.block__element--name' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves BEM chain with compound selector in multiple elements', () => {
		const rule = getRuleBySelector(`
			.block {
				&__element, &__foo {
					&--name {
						&--value, &--foo {}
					}
				}
			}
		`, '&--value, &--foo');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierValue', selector: '.block__element--name--value' },
				{ type: 'modifierName', selector: '.block__element--name' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
			[
				{ type: 'modifierValue', selector: '.block__foo--name--value' },
				{ type: 'modifierName', selector: '.block__foo--name' },
				{ type: 'element', selector: '.block__foo' },
				{ type: 'block', selector: '.block' },
			],
			[
				{ type: 'modifierValue', selector: '.block__element--name--foo' },
				{ type: 'modifierName', selector: '.block__element--name' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
			[
				{ type: 'modifierValue', selector: '.block__foo--name--foo' },
				{ type: 'modifierName', selector: '.block__foo--name' },
				{ type: 'element', selector: '.block__foo' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves BEM chain with compound selector using different entities', () => {
		const rule = getRuleBySelector(`
			.block {
				&__element, &__foo--name {
					&--value {}
				}
			}
		`, '&--value');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierName', selector: '.block__element--value' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
			[
				{ type: 'modifierValue', selector: '.block__foo--name--value' },
				{ type: 'modifierName', selector: '.block__foo--name' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves elements within `@at-root` or `@nest`', () => {
		const rule = getRuleBySelector(`
			.block {
				@at-root &__element {
					@nest &--bar {}
				}
			}
		`, '&--bar');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierName', selector: '.block__element--bar' },
				{ type: 'element', selector: '.block__element' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves different block name nested in `@at-root` without using `&`', () => {
		const rule = getRuleBySelector(`
			.the-component {
				&__element, &--modifier {
					&-value {
						@at-root .foo {
							&-block {
								&__el {
									@nest &-val {}
								}
							}
						}
					}
				}
			}
		`, '&-val');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'element', selector: '.foo-block__el-val' },
				{ type: 'element', selector: '.foo-block__el' },
				{ type: 'block', selector: '.foo-block' },
				{ type: 'block', selector: '.foo' },
			],
		]);
	});

	it('Resolves nested BEM blocks', () => {
		const rule = getRuleBySelector(`
			.block {
				.foo, &-b {
					&__bar {
						&-el {
							&--mod {}
						}
					}
				}
			}
		`, '&--mod');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierName', selector: '.foo__bar-el--mod' },
				{ type: 'element', selector: '.foo__bar-el' },
				{ type: 'element', selector: '.foo__bar' },
				{ type: 'block', selector: '.foo' },
			],
			[
				{ type: 'modifierName', selector: '.block-b__bar-el--mod' },
				{ type: 'element', selector: '.block-b__bar-el' },
				{ type: 'element', selector: '.block-b__bar' },
				{ type: 'block', selector: '.block-b' },
				{ type: 'block', selector: '.block' },
			],
		]);
	});

	it('Resolves nested BEM blocks with multiple chains', () => {
		const rule = getRuleBySelector(`
			.the-component {
				&__element, .foo {
					&--bar {
						&-baz {}
					}
				}
			}
		`, '&-baz');

		const result = resolveBemChain(rule, separators);

		expect(simplifyChains(result)).toStrictEqual([
			[
				{ type: 'modifierName', selector: '.the-component__element--bar-baz' },
				{ type: 'modifierName', selector: '.the-component__element--bar' },
				{ type: 'element', selector: '.the-component__element' },
				{ type: 'block', selector: '.the-component' },
			],
			[
				{ type: 'modifierName', selector: '.foo--bar-baz' },
				{ type: 'modifierName', selector: '.foo--bar' },
				{ type: 'block', selector: '.foo' },
			],
		]);
	});
});
