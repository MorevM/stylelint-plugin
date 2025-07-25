import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { DEFAULT_SEPARATORS } from '#modules/bem';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveBemEntities } from './resolve-bem-entities';
import type { Rule } from 'postcss';
import type { Separators } from '#modules/shared';

const separators = DEFAULT_SEPARATORS;

const resolveWith = (source: string, ruleSelector?: string, customSeparators?: Separators) => {
	const { root } = postcss().process(source.trim(), { syntax: postcssScss });

	const rule = ruleSelector
		? getRuleBySelector(root, ruleSelector)
		: root.nodes[0] as Rule;

	return resolveBemEntities({ rule, separators: customSeparators ?? separators });
};

describe(resolveBemEntities, () => {
	describe('Common mechanics', () => {
		it(`Does not resolve entities for selectors without classes`, () => {
			expect(resolveWith(`a {}`)).toStrictEqual([]);
			expect(resolveWith(`#id {}`)).toStrictEqual([]);
			expect(resolveWith(`a[class="qwe"] {}`)).toStrictEqual([]);
			expect(resolveWith(`::where(section h3) {}`)).toStrictEqual([]);
			expect(resolveWith(`section::has(h1)::before {}`)).toStrictEqual([]);
		});

		it(`The number of resolved entities is equal to the number of potential BEM blocks in the selector`, () => {
			expect(resolveWith(`a {}`)).toHaveLength(0);
			expect(resolveWith(`.the-component {}`)).toHaveLength(1);
			expect(resolveWith(`.the-component:is(.the-component--active) {}`)).toHaveLength(2);
			expect(resolveWith(`.the-component.another-one {}`)).toHaveLength(2);
			expect(resolveWith(`.the-component, .another-one.another-one--active {}`)).toHaveLength(3);
			expect(resolveWith(`.the-component, .another-one.foo-component + .another-one {}`)).toHaveLength(4);
			expect(resolveWith(`html #wrapper .the-component, .another-one.is-active:has(.bar, .baz) {}`)).toHaveLength(5);
			expect(resolveWith(`@at-root .foo-component {}`)).toHaveLength(1);
			expect(resolveWith(`@at-root section.foo-component, [data-test].bar-component {}`)).toHaveLength(2);
		});
	});

	describe('Structure tests', () => {
		describe('Plain selector', () => {
			it('Resolves BEM block, element, modifier name / value pairs from a plain selector', () => {
				const entity = resolveWith(`
					.block__element--modifier-name--modifier-value {}
				`)[0];

				expect(entity.block.value).toBe('block');
				expect(entity.element?.value).toBe('element');
				expect(entity.modifierName?.value).toBe('modifier-name');
				expect(entity.modifierValue?.value).toBe('modifier-value');
			});

			it('Resolves BEM entities from root-level pseudo and nested pseudos as well', () => {
				const result = resolveWith(`
					:is(.block__element--modifier-name--modifier-value:is(.foo)) {}
				`);

				expect(result).toHaveLength(2);

				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('element');
				expect(result[0].modifierName?.value).toBe('modifier-name');
				expect(result[0].modifierValue?.value).toBe('modifier-value');

				expect(result[1].block.value).toBe('foo');
				expect(result[1].element?.value).toBeUndefined();
				expect(result[1].modifierName?.value).toBeUndefined();
				expect(result[1].modifierValue?.value).toBeUndefined();
			});

			it('Set entity parts to `undefined` if they are not presented', () => {
				const entity = resolveWith(`
					.block--modifier {}
				`)[0];

				expect(entity.block.value).toBe('block');
				expect(entity.element?.value).toBeUndefined();
				expect(entity.modifierName?.value).toBe('modifier');
				expect(entity.modifierValue?.value).toBeUndefined();
			});

			it('Resolves compound selector at once', () => {
				const result = resolveWith(`
					.block__foo, .block__bar {}
				`);

				expect(result).toHaveLength(2);

				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('foo');

				expect(result[1].block.value).toBe('block');
				expect(result[1].element?.value).toBe('bar');
			});
		});

		describe('Nested selector', () => {
			it('Resolves BEM block, element, modifier name / value pairs from a nested selector', () => {
				const entity = resolveWith(`
					.block {
						&__element {
							&--modifier-name {
								&--modifier-value {}
							}
						}
					}
				`, `&--modifier-value`)[0];

				expect(entity.block.value).toBe('block');
				expect(entity.element?.value).toBe('element');
				expect(entity.modifierName?.value).toBe('modifier-name');
				expect(entity.modifierValue?.value).toBe('modifier-value');
			});

			it('Resolves only parts that are relevant to the given selector', () => {
				const result = resolveWith(`
					.foo .bar .block {
						&__element {}
					}
				`, `&__element`);

				expect(result).toHaveLength(1);

				const entity = result[0];

				expect(entity.block.value).toBe('block');
				expect(entity.element?.value).toBe('element');
			});

			it('Resolves compound selector at once', () => {
				const result = resolveWith(`
					.block {
						&__foo, &__bar {}
					}
				`, `&__foo, &__bar`);

				expect(result).toHaveLength(2);

				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('foo');

				expect(result[1].block.value).toBe('block');
				expect(result[1].element?.value).toBe('bar');
			});

			it('Resolves entities from `@at-root` directive using nesting in the middle of selector', () => {
				const result = resolveWith(`
					.foo__item {
						@at-root .bar__item:not(.block) & .baz__item {}
					}
				`, `.bar__item:not(.block) & .baz__item`);

				expect(result).toHaveLength(4);

				expect(result[0].block.value).toBe('bar');
				expect(result[0].block.sourceRange).toStrictEqual([10, 13]);
				expect(result[0].element?.value).toBe('item');
				expect(result[0].element?.sourceRange).toStrictEqual([15, 19]);

				expect(result[1].block.value).toBe('block');
				expect(result[1].block.sourceRange).toStrictEqual([25, 30]);
				expect(result[1].element?.value).toBeUndefined();
				expect(result[1].element?.sourceRange).toBeUndefined();

				expect(result[2].block.value).toBe('foo');
				expect(result[2].block.sourceRange).toBeUndefined();
				expect(result[2].element?.value).toBe('item');
				expect(result[2].element?.sourceRange).toBeUndefined();

				expect(result[3].block.value).toBe('baz');
				expect(result[3].block.sourceRange).toStrictEqual([35, 38]);
				expect(result[3].element?.value).toBe('item');
				expect(result[3].element?.sourceRange).toStrictEqual([40, 44]);
			});

			it('Resolves entities from `@nest` directive', () => {
				const result = resolveWith(`
					.foo {
						@nest .bar & {}
					}
				`, `.bar &`);

				expect(result).toHaveLength(2);

				expect(result[0].block.value).toBe('bar');
				expect(result[0].block.sourceRange).toStrictEqual([7, 10]);

				expect(result[1].block.value).toBe('foo');
				expect(result[1].block.sourceRange).toBeUndefined();
			});
		});

		describe('Custom source', () => {
			it('Resolves entities by `source`, not `Rule` or `AtRule`', () => {
				const result = resolveBemEntities({
					source: '.block__element--modifier',
					separators,
				});

				expect(result).toHaveLength(1);

				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('element');
				expect(result[0].modifierName?.value).toBe('modifier');
				expect(result[0].modifierValue?.value).toBeUndefined();
			});

			it('Prefers `source` over rule.selector even if they conflict', () => {
				const { root } = postcss().process(`
					.block {
						&--mod {}
					}
				`, { syntax: postcssScss });

				// @ts-expect-error — trust me, it's a Rule
				const rule = root.nodes[0].nodes[0];

				const result = resolveBemEntities({ rule, source: '&__element--alt-mod', separators });

				expect(result).toHaveLength(1);
				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('element');
				expect(result[0].modifierName?.value).toBe('alt-mod');
			});

			it('Resolves entities by custom `source`', () => {
				const { root } = postcss().process(`
				.foo {
					&__bar {}
				}
			`, { syntax: postcssScss });

				// @ts-expect-error -- Trust me it exists
				const rule = root.nodes[0].nodes[0];

				const result = resolveBemEntities({ rule, separators, source: '&__baz, &__qwe' });

				expect(result).toHaveLength(2);

				expect(result[0].block.value).toBe('foo');
				expect(result[0].element?.value).toBe('baz');

				expect(result[1].block.value).toBe('foo');
				expect(result[1].element?.value).toBe('qwe');
			});

			it('Resolves entity from invalid-looking but syntactically correct BEM class', () => {
				const result = resolveWith(`.block_______element {}`);

				expect(result).toHaveLength(1);
				expect(result[0].block.value).toBe('block');
				expect(result[0].element?.value).toBe('_____element');
			});

			it('Returns empty array for empty selector string', () => {
				expect(resolveBemEntities({ separators, source: '' })).toStrictEqual([]);
			});
		});

		// TODO: The order is incorrect, but the structure is valid.
		// It's not a big problem now, but it will need to be rewritten later.
		describe('sourceContext', () => {
			it('Properly identifies the source context', () => {
				const { root } = postcss().process(`
					.foo:is(.bar:not(.baz)).foo--mod.component {}
				`, { syntax: postcssScss });

				const rule = root.nodes[0] as Rule;
				const result = resolveBemEntities({ rule, separators });

				expect(result).toHaveLength(5);

				expect(result[0].block.value).toBe('foo');
				expect(result[0].sourceContext).toBeNull();

				expect(result[1].block.value).toBe('component');
				expect(result[1].sourceContext).toBe('entity');

				expect(result[2].block.value).toBe('bar');
				expect(result[2].sourceContext).toBe(':is');

				expect(result[3].block.value).toBe('foo');
				expect(result[3].sourceContext).toBe('modifier');

				expect(result[4].block.value).toBe('baz');
				expect(result[4].sourceContext).toBe(':not');
			});
		});
	});

	describe('Indices', () => {
		it('Resolves proper indices with plain selector', () => {
			const result = resolveWith(`
				.block__element--modifier-name--modifier-value {}
			`);

			expect(result[0].block.sourceRange).toStrictEqual([1, 6]);
			expect(result[0].element?.sourceRange).toStrictEqual([8, 15]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([17, 30]);
			expect(result[0].modifierValue?.sourceRange).toStrictEqual([32, 46]);
		});

		it('Resolves proper indices with consecutive classes', () => {
			const result = resolveWith(`
				.block.foo-block {}
			`);

			expect(result[1].block.sourceRange).toStrictEqual([7, 16]);
		});

		it('Resolves proper indices with plain selector in root-level pseudo', () => {
			const result = resolveWith(`
				:is(.block__element--modifier-name--modifier-value) {}
			`);

			expect(result[0].block.sourceRange).toStrictEqual([5, 10]);
			expect(result[0].element?.sourceRange).toStrictEqual([12, 19]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([21, 34]);
			expect(result[0].modifierValue?.sourceRange).toStrictEqual([36, 50]);
		});

		it('Resolves proper indices using CSS nesting', () => {
			const result = resolveWith(`
				.foo {
					.block__element--modifier-name--modifier-value {}
				}
			`, `.block__element--modifier-name--modifier-value`);

			expect(result[0].block.sourceRange).toStrictEqual([1, 6]);
			expect(result[0].element?.sourceRange).toStrictEqual([8, 15]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([17, 30]);
			expect(result[0].modifierValue?.sourceRange).toStrictEqual([32, 46]);
		});

		it('Resolves proper indices using CSS nesting with pseudo', () => {
			const result = resolveWith(`
				.foo {
					&:has(.card--active) {}
				}
			`, `&:has(.card--active)`);

			expect(result).toHaveLength(2); // .foo  .card--active

			expect(result[1].block.sourceRange).toStrictEqual([7, 11]);
			expect(result[1].element?.sourceRange).toBeUndefined();
			expect(result[1].modifierName?.sourceRange).toStrictEqual([13, 19]);
			expect(result[1].modifierValue?.sourceRange).toBeUndefined();
		});

		it('Resolves proper indices using SCSS nesting', () => {
			const result = resolveWith(`
				.foo {
					&__item--modifier {}
				}
			`, `&__item--modifier`);

			expect(result).toHaveLength(1);

			expect(result[0].block.sourceRange).toBeUndefined();
			expect(result[0].element?.sourceRange).toStrictEqual([3, 7]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([9, 17]);
			expect(result[0].modifierValue?.sourceRange).toBeUndefined();
		});

		it('Resolves proper indices using SCSS nesting if the block name is splitted', () => {
			const result = resolveWith(`
				.foo {
					&-bar__item--modifier {}
				}
			`, `&-bar__item--modifier`);

			expect(result).toHaveLength(1);

			expect(result[0].block.sourceRange).toStrictEqual([0, 5]);
			expect(result[0].element?.sourceRange).toStrictEqual([7, 11]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([13, 21]);
			expect(result[0].modifierValue?.sourceRange).toBeUndefined();
		});

		it('Resolves proper indices using SCSS nesting if the element is splitted', () => {
			const result = resolveWith(`
				.foo {
					&__item {
						&-title {
							&-icon--icon {}
						}
					}
				}
			`, `&-icon--icon`);

			expect(result).toHaveLength(1);

			expect(result[0].block.sourceRange).toBeUndefined();
			expect(result[0].element?.sourceRange).toStrictEqual([0, 6]);
			expect(result[0].modifierName?.sourceRange).toStrictEqual([8, 12]);
			expect(result[0].modifierValue?.sourceRange).toBeUndefined();
		});

		it('Resolves proper indices using SCSS nesting if the element is splitted in compound selector', () => {
			const result = resolveWith(`
				.foo {
					&__item {
						&-title, &-value, &--mod, span &-el {}
					}
				}
			`, `&-title, &-value, &--mod, span &-el`);

			expect(result).toHaveLength(4);

			expect(result[0].block.sourceRange).toBeUndefined();
			expect(result[0].element?.sourceRange).toStrictEqual([0, 7]);

			expect(result[1].block.sourceRange).toBeUndefined();
			expect(result[1].element?.sourceRange).toStrictEqual([9, 16]);

			expect(result[2].block.sourceRange).toBeUndefined();
			expect(result[2].modifierName?.sourceRange).toStrictEqual([21, 24]);

			expect(result[3].block.sourceRange).toBeUndefined();
			expect(result[3].element?.sourceRange).toStrictEqual([31, 35]);
		});

		it('Resolves proper indices using SCSS nesting if the modifier value is deeply splitted', () => {
			const result = resolveWith(`
				.foo {
					&__item {
						&--modifier {
							&--name {
								&-surname {
									&-patronymic {}
								}
							}
						}
					}
				}
			`, `&-patronymic`);

			expect(result).toHaveLength(1);

			expect(result[0].block.sourceRange).toBeUndefined();
			expect(result[0].element?.sourceRange).toBeUndefined();
			expect(result[0].modifierName?.sourceRange).toBeUndefined();
			expect(result[0].modifierValue?.value).toBe('name-surname-patronymic');
			expect(result[0].modifierValue?.sourceRange).toStrictEqual([0, 12]);
		});

		it('Resolves proper indices if BEM entity is placed within pseudo and uses nesting', () => {
			const result = resolveWith(`
				.foo {
					&__item--mod:has(#{&}-block--mod) {}
				}
			`, `&__item--mod:has(#{&}-block--mod)`);

			expect(result).toHaveLength(2);

			expect(result[1].block.value).toBe('foo-block');
			expect(result[1].block.sourceRange).toStrictEqual([17, 27]);
			expect(result[1].element?.value).toBeUndefined();
			expect(result[1].modifierName?.value).toBe('mod');
		});
	});

	describe('Default options (two dash style)', () => {
		describe('Block', () => {
			it(`Resolves BEM Block in any case`, () => {
				expect(resolveWith(`.the-component {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.theComponent {}`)[0].block.value).toBe('theComponent');
				expect(resolveWith(`.TheComponent {}`)[0].block.value).toBe('TheComponent');
				expect(resolveWith(`.компонент {}`)[0].block.value).toBe('компонент');
			});

			it(`Resolves a BEM block followed by another BEM entities or pseudo-classes/pseudo-elements`, () => {
				expect(resolveWith(`.the-component:hover {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component::placeholder {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component.bar-component {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component#id.is-active.is-disabled {}`)[0].block.value).toBe('the-component');
			});

			it(`Resolves a BEM block followed by combinators`, () => {
				expect(resolveWith(`.the-component + .the-component {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component > .another-component {}`)[0].block.value).toBe('the-component');
			});

			it(`Resolves a BEM block followed by element`, () => {
				expect(resolveWith(`.the-component__element {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component__element {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component__element-foo {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component__element-foo:hover {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component__element-foo.is-active {}`)[0].block.value).toBe('the-component');
			});

			it(`Resolves a BEM block followed by modifier`, () => {
				expect(resolveWith(`.the-component--modifier {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component--modifier-foo {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component--modifier-foo--bar {}`)[0].block.value).toBe('the-component');
			});

			it(`Resolves a BEM block followed by a separator without value`, () => {
				expect(resolveWith(`.the-component__ {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component-- {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component__element-- {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component--modifier-foo-- {}`)[0].block.value).toBe('the-component');
			});
		});

		describe('Element', () => {
			it(`Does not resolve when no element is present`, () => {
				expect(resolveWith(`.the-component {}`)[0].element?.value).toBeUndefined();
				expect(resolveWith(`.the-component--modifier {}`)[0].element?.value).toBeUndefined();
				expect(resolveWith(`.the-component--modifier--value {}`)[0].element?.value).toBeUndefined();
				expect(resolveWith(`.the-component:hover {}`)[0].element?.value).toBeUndefined();
				expect(resolveWith(`.the-component.is-active {}`)[0].element?.value).toBeUndefined();
			});

			it(`Resolves BEM element in any case`, () => {
				expect(resolveWith(`.the-component__element {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element-foo {}`)[0].element?.value).toBe('element-foo');
				expect(resolveWith(`.the-component__elementFoo {}`)[0].element?.value).toBe('elementFoo');
				expect(resolveWith(`.the-component__ElementFoo {}`)[0].element?.value).toBe('ElementFoo');
				expect(resolveWith(`.the-component__элемент {}`)[0].element?.value).toBe('элемент');
			});

			it(`Resolves a BEM element followed by utilities or pseudo-classes/pseudo-elements`, () => {
				expect(resolveWith(`.the-component__element:hover {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element::placeholder {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element.is-active {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element.is-active.is-disabled {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element#id.is-active.is-disabled {}`)[0].element?.value).toBe('element');
			});

			it(`Resolves a BEM element followed by combinators`, () => {
				expect(resolveWith(`.the-component__element + .the-component__element {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element > .another-component {}`)[0].element?.value).toBe('element');
			});

			it(`Resolves a BEM element followed by modifier`, () => {
				expect(resolveWith(`.the-component__element--modifier {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element--modifier-foo {}`)[0].element?.value).toBe('element');
				expect(resolveWith(`.the-component__element--modifier-foo--bar {}`)[0].element?.value).toBe('element');
			});

			it(`Resolves a BEM element followed by a separator without value`, () => {
				expect(resolveWith(`.the-component__element--foo {}`)[0].element?.value).toBe('element');
			});
		});

		describe('Modifier Name', () => {
			it(`Does not resolve when no modifier is present`, () => {
				expect(resolveWith(`.the-component {}`)[0].modifierName?.value).toBeUndefined();
				expect(resolveWith(`.the-component__element {}`)[0].modifierName?.value).toBeUndefined();
				expect(resolveWith(`.the-component:hover {}`)[0].modifierName?.value).toBeUndefined();
				expect(resolveWith(`.the-component.is-active {}`)[0].modifierName?.value).toBeUndefined();
			});

			it(`Resolves a BEM modifier for block in any case`, () => {
				expect(resolveWith(`.the-component--modifier {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component--modifier-foo {}`)[0].modifierName?.value).toBe('modifier-foo');
				expect(resolveWith(`.the-component--modifierFoo {}`)[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.the-component--ModifierFoo {}`)[0].modifierName?.value).toBe('ModifierFoo');
				expect(resolveWith(`.the-component--модификатор {}`)[0].modifierName?.value).toBe('модификатор');
			});

			it(`Resolves a BEM modifier for element`, () => {
				expect(resolveWith(`.the-component__element--modifier {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component__element-foo--modifier-foo {}`)[0].modifierName?.value).toBe('modifier-foo');
				expect(resolveWith(`.the-component__elementFoo--modifierFoo {}`)[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.the-component__ElementBar--ModifierFoo {}`)[0].modifierName?.value).toBe('ModifierFoo');
				expect(resolveWith(`.the-component__элемент--модификатор {}`)[0].modifierName?.value).toBe('модификатор');
			});

			it(`Resolves a BEM modifier followed by modifier value`, () => {
				expect(resolveWith(`.the-component--modifier--value {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component__element--modifier--value {}`)[0].modifierName?.value).toBe('modifier');
			});

			it(`Resolves a BEM modifier followed by utilities or pseudo-classes/pseudo-elements`, () => {
				expect(resolveWith(`.the-component--modifier:hover {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component__element--modifier.is-active {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component--modifier.is-active.is-disabled {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component--modifier#id.is-active.is-disabled {}`)[0].modifierName?.value).toBe('modifier');
			});

			it(`Resolves a BEM modifier followed by a separator without value`, () => {
				expect(resolveWith(`.the-component--modifier-- {}`)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component__element--modifier-- {}`)[0].modifierName?.value).toBe('modifier');
			});
		});

		describe('Modifier Value', () => {
			it(`Does not resolve when no modifier value is present`, () => {
				expect(resolveWith(`.the-component {}`)[0].modifierValue?.value).toBeUndefined();
				expect(resolveWith(`.the-component__element {}`)[0].modifierValue?.value).toBeUndefined();
				expect(resolveWith(`.the-component--modifier {}`)[0].modifierValue?.value).toBeUndefined();
				expect(resolveWith(`.the-component__element--modifier {}`)[0].modifierValue?.value).toBeUndefined();
				expect(resolveWith(`.the-component--modifier:hover {}`)[0].modifierValue?.value).toBeUndefined();
				expect(resolveWith(`.the-component--modifier.is-active {}`)[0].modifierValue?.value).toBeUndefined();
			});

			it(`Resolves a BEM modifier value for block`, () => {
				expect(resolveWith(`.the-component--modifier--value {}`)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component--modifier--value-foo {}`)[0].modifierValue?.value).toBe('value-foo');
				expect(resolveWith(`.the-component--modifier--значение {}`)[0].modifierValue?.value).toBe('значение');
			});

			it(`Resolves a BEM modifier value for element`, () => {
				expect(resolveWith(`.the-component__element--modifier--value {}`)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component__element--modifier--value-foo {}`)[0].modifierValue?.value).toBe('value-foo');
				expect(resolveWith(`.the-component__element--modifier--значение {}`)[0].modifierValue?.value).toBe('значение');
			});

			it(`Resolves a BEM modifier value followed by utilities or pseudo-classes/pseudo-elements`, () => {
				expect(resolveWith(`.the-component--modifier--value:hover {}`)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component__element--modifier--value.is-active {}`)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component--modifier--value.is-active.is-disabled {}`)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component--modifier--value#id.is-active.is-disabled {}`)[0].modifierValue?.value).toBe('value');
			});
		});

		describe('Compound selectors', () => {
			it(`Resolves multiple BEM blocks`, () => {
				const resolved = resolveWith(`
					html .the-component__ .foo-component--modifier,
					.bar-component {}
				`);

				expect(resolved[0].block.value).toBe('the-component');
				expect(resolved[1].block.value).toBe('foo-component');
				expect(resolved[2].block.value).toBe('bar-component');
			});

			it(`Resolves multiple BEM modifier values`, () => {
				const resolved = resolveWith(`
					.the-component--mod--mod-value .foo-component__bar--mod2--mod-value2,
					.the-component--mod3 .bar-component {}
				`);

				expect(resolved[0].modifierValue?.value).toBe('mod-value');
				expect(resolved[1].modifierValue?.value).toBe('mod-value2');
				expect(resolved[2].modifierValue?.value).toBeUndefined();
				expect(resolved[3].modifierValue?.value).toBeUndefined();
			});

			it(`Resolves multiple BEM elements`, () => {
				const resolved = resolveWith(`
					.the-component__element .foo-component__bar,
					.the-component__baz .bar-component {}
				`);

				expect(resolved[0].element?.value).toBe('element');
				expect(resolved[1].element?.value).toBe('bar');
				expect(resolved[2].element?.value).toBe('baz');
				expect(resolved[3].element?.value).toBeUndefined();
			});

			it(`Resolves multiple BEM modifiers`, () => {
				const resolved = resolveWith(`
					.the-component--mod .foo-component__bar--mod2,
					.the-component--mod3 .bar-component {}
				`);

				expect(resolved[0].modifierName?.value).toBe('mod');
				expect(resolved[1].modifierName?.value).toBe('mod2');
				expect(resolved[2].modifierName?.value).toBe('mod3');
				expect(resolved[3].modifierName?.value).toBeUndefined();
			});
		});
	});

	describe('Custom separators (react style for instance)', () => {
		const customSeparators = {
			elementSeparator: '-',
			modifierSeparator: '_',
			modifierValueSeparator: '_',
		};

		describe('Block', () => {
			it(`Resolves BEM block followed by element`, () => {
				expect(resolveWith(`.theComponent-element {}`, undefined, customSeparators)[0].block?.value).toBe('theComponent');
				expect(resolveWith(`.TheComponent-element {}`, undefined, customSeparators)[0].block?.value).toBe('TheComponent');
			});

			it(`Resolves BEM block followed by modifier`, () => {
				expect(resolveWith(`.theComponent_modifier {}`, undefined, customSeparators)[0].block?.value).toBe('theComponent');
				expect(resolveWith(`.TheComponent_modifier_value {}`, undefined, customSeparators)[0].block?.value).toBe('TheComponent');
			});
		});

		describe('Element', () => {
			it(`Resolves BEM element`, () => {
				expect(resolveWith(`.theComponent-element {}`, undefined, customSeparators)[0].element?.value).toBe('element');
				expect(resolveWith(`.theComponent-elementFoo {}`, undefined, customSeparators)[0].element?.value).toBe('elementFoo');
				expect(resolveWith(`.theComponent-ElementFoo {}`, undefined, customSeparators)[0].element?.value).toBe('ElementFoo');
				expect(resolveWith(`.theComponent-ElementFoo_modifier {}`, undefined, customSeparators)[0].element?.value).toBe('ElementFoo');
				expect(resolveWith(`.theComponent-ElementFoo_modifier_value {}`, undefined, customSeparators)[0].element?.value).toBe('ElementFoo');
			});
		});

		describe('Modifier Name', () => {
			it(`Resolves BEM modifier for block`, () => {
				expect(resolveWith(`.theComponent_modifier {}`, undefined, customSeparators)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.theComponent_modifierFoo {}`, undefined, customSeparators)[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.theComponent_modifier-foo {}`, undefined, customSeparators)[0].modifierName?.value).toBe('modifier-foo');
			});

			it(`Resolves BEM modifier for element`, () => {
				expect(resolveWith(`.theComponent-element_modifier {}`, undefined, customSeparators)[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.theComponent-elementFoo_modifierFoo {}`, undefined, customSeparators)[0].modifierName?.value).toBe('modifierFoo');
			});
		});

		describe('Modifier Value', () => {
			it(`Resolves BEM modifier value for block`, () => {
				expect(resolveWith(`.theComponent_modifier_value {}`, undefined, customSeparators)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.theComponent_modifier_value-foo {}`, undefined, customSeparators)[0].modifierValue?.value).toBe('value-foo');
			});

			it(`Resolves BEM modifier value for element`, () => {
				expect(resolveWith(`.theComponent-element_modifier_value {}`, undefined, customSeparators)[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.theComponent-element-foo_modifier_valueFoo {}`, undefined, customSeparators)[0].modifierValue?.value).toBe('valueFoo');
			});
		});
	});
});
