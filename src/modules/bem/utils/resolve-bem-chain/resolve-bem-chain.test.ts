import { DEFAULT_SEPARATORS } from '#modules/bem';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveBemChain } from './resolve-bem-chain';
import type { BemChain } from './resolve-bem-chain.types';

const separators = DEFAULT_SEPARATORS;

const simplifyChains = (chains: BemChain[]) => {
	return chains.map((chainItem) => {
		return chainItem.map((item) => {
			return {
				entityType: item.entityType,
				bemSelector: item.bemSelector,
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
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierValue', bemSelector: '.block__element--modifier-name--modifier-value' },
				{ entityType: 'modifierName', bemSelector: '.block__element--modifier-name' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierValue', bemSelector: '.block-foo__element-foo--modifier-name-foo--modifier-value-bar' },
				{ entityType: 'modifierValue', bemSelector: '.block-foo__element-foo--modifier-name-foo--modifier-value' },
				{ entityType: 'modifierName', bemSelector: '.block-foo__element-foo--modifier-name-foo' },
				{ entityType: 'modifierName', bemSelector: '.block-foo__element-foo--modifier-name' },
				{ entityType: 'element', bemSelector: '.block-foo__element-foo' },
				{ entityType: 'element', bemSelector: '.block-foo__element' },
				{ entityType: 'block', bemSelector: '.block-foo' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierValue', bemSelector: '.block__element--name--value' },
				{ entityType: 'modifierName', bemSelector: '.block__element--name' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
			],
			[
				{ entityType: 'modifierValue', bemSelector: '.block__element--name--foo' },
				{ entityType: 'modifierName', bemSelector: '.block__element--name' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierValue', bemSelector: '.block__element--name--value' },
				{ entityType: 'modifierName', bemSelector: '.block__element--name' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
			],
			[
				{ entityType: 'modifierValue', bemSelector: '.block__foo--name--value' },
				{ entityType: 'modifierName', bemSelector: '.block__foo--name' },
				{ entityType: 'element', bemSelector: '.block__foo' },
				{ entityType: 'block', bemSelector: '.block' },
			],
			[
				{ entityType: 'modifierValue', bemSelector: '.block__element--name--foo' },
				{ entityType: 'modifierName', bemSelector: '.block__element--name' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
			],
			[
				{ entityType: 'modifierValue', bemSelector: '.block__foo--name--foo' },
				{ entityType: 'modifierName', bemSelector: '.block__foo--name' },
				{ entityType: 'element', bemSelector: '.block__foo' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierName', bemSelector: '.block__element--value' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
			],
			[
				{ entityType: 'modifierValue', bemSelector: '.block__foo--name--value' },
				{ entityType: 'modifierName', bemSelector: '.block__foo--name' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierName', bemSelector: '.block__element--bar' },
				{ entityType: 'element', bemSelector: '.block__element' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierName', bemSelector: '.foo__bar-el--mod' },
				{ entityType: 'element', bemSelector: '.foo__bar-el' },
				{ entityType: 'element', bemSelector: '.foo__bar' },
				{ entityType: 'block', bemSelector: '.foo' },
			],
			[
				{ entityType: 'modifierName', bemSelector: '.block-b__bar-el--mod' },
				{ entityType: 'element', bemSelector: '.block-b__bar-el' },
				{ entityType: 'element', bemSelector: '.block-b__bar' },
				{ entityType: 'block', bemSelector: '.block-b' },
				{ entityType: 'block', bemSelector: '.block' },
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
				{ entityType: 'modifierName', bemSelector: '.the-component__element--bar-baz' },
				{ entityType: 'modifierName', bemSelector: '.the-component__element--bar' },
				{ entityType: 'element', bemSelector: '.the-component__element' },
				{ entityType: 'block', bemSelector: '.the-component' },
			],
			[
				{ entityType: 'modifierName', bemSelector: '.foo--bar-baz' },
				{ entityType: 'modifierName', bemSelector: '.foo--bar' },
				{ entityType: 'block', bemSelector: '.foo' },
			],
		]);
	});
});
