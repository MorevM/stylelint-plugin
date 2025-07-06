import { parse } from 'postcss';
import { resolveBemEntities } from './resolve-bem-entities';
import type { Rule } from 'postcss';

const getFirstNode = (sourceCss: string) => {
	const root = parse(sourceCss);

	return root.nodes[0] as Rule;
};

const styles = {
	TWO_DASH: {
		elementSeparator: '__',
		modifierSeparator: '--',
		modifierValueSeparator: '--',
	},
	TRADITIONAL: {
		elementSeparator: '__',
		modifierSeparator: '_',
		modifierValueSeparator: '_',
	},
	REACT: {
		elementSeparator: '-',
		modifierSeparator: '_',
		modifierValueSeparator: '_',
	},
};

const resolveWith = (
	sourceCss: string,
	style: keyof (typeof styles) = 'TWO_DASH',
) => {
	return resolveBemEntities(
		getFirstNode(sourceCss),
		styles[style],
	);
};

describe(resolveBemEntities, () => {
	describe('Common mechanics', () => {
		it(`Does not resolve entities for selectors without classes`, () => {
			expect(resolveWith(`a {}`)).toStrictEqual([]);
			expect(resolveWith(`#id {}`)).toStrictEqual([]);
			expect(resolveWith(`a[class="qwe"] {}`)).toStrictEqual([]);
			expect(resolveWith(`div.class {}`)).toStrictEqual([]);
			expect(resolveWith(`[class="qwe"].qwe {}`)).toStrictEqual([]);
			expect(resolveWith(`a:hover.qwe {}`)).toStrictEqual([]);
			expect(resolveWith(`a::focus.qwe {}`)).toStrictEqual([]);
		});

		it(`The number of resolved entities is equal to the number of potential BEM blocks in the selector`, () => {
			expect(resolveWith(`a {}`)).toHaveLength(0);
			expect(resolveWith(`.the-component {}`)).toHaveLength(1);
			expect(resolveWith(`.the-component .another-one {}`)).toHaveLength(2);
			expect(resolveWith(`.the-component, .another-one.is-active {}`)).toHaveLength(2);
			expect(resolveWith(`.the-component, .another-one.is-active + .another-one {}`)).toHaveLength(3);
			expect(resolveWith(`html #wrapper .the-component, .another-one.is-active + .another-one {}`)).toHaveLength(3);
			expect(resolveWith(`@at-root .foo-component {}`)).toHaveLength(1);
			expect(resolveWith(`@at-root .foo-component, .bar-component {}`)).toHaveLength(2);
		});
	});

	describe('Structure tests', () => {
		it('Resolves full structure for complex selector without nesting', () => {
			const entity = resolveWith(`.block__el--mod--val.util-1.util-2 {}`)[0];

			expect(entity.originalSelector).toBe('.block__el--mod--val.util-1.util-2');
			expect(entity.resolvedSelector).toBe('.block__el--mod--val.util-1.util-2');

			expect(entity.selector.value).toBe('.block__el--mod--val.util-1.util-2');
			expect(entity.selector.startIndex).toBe(0);
			expect(entity.selector.endIndex).toBe(entity.selector.value.length);

			expect(entity.block?.value).toBe('block');
			expect(entity.element?.value).toBe('el');
			expect(entity.modifierName?.value).toBe('mod');
			expect(entity.modifierValue?.value).toBe('val');
			expect(entity.utility?.map((u) => u.value)).toStrictEqual(['util-1', 'util-2']);
		});

		it('Resolves full structure for complex compound selector without nesting', () => {
			const entity = resolveWith(`
				.block__el--mod--val.util-1.util-2, .foo--mod {}
			`)[1];

			expect(entity.originalSelector).toBe('.block__el--mod--val.util-1.util-2, .foo--mod');
			expect(entity.resolvedSelector).toBe('.block__el--mod--val.util-1.util-2, .foo--mod');

			expect(entity.selector.value).toBe('.foo--mod');
			expect(entity.selector.startIndex).toBe(36);
			expect(entity.selector.endIndex).toBe(36 + entity.selector.value.length);

			expect(entity.block?.value).toBe('foo');
			expect(entity.element).toBeUndefined();
			expect(entity.modifierName?.value).toBe('mod');
			expect(entity.modifierValue).toBeUndefined();
			expect(entity.utility).toBeUndefined();
		});

		it('Resolves full structure for complex selector using nesting', () => {
			const root = parse(`
				.block {
					&__el {
						&--mod--value.is-active {}
					}
				}
			`);

			// @ts-expect-error -- Trust me it exists
			const entity = resolveBemEntities(root.nodes[0].nodes[0].nodes[0], styles.TWO_DASH)[0];

			expect(entity.originalSelector).toBe('&--mod--value.is-active');
			expect(entity.resolvedSelector).toBe('.block__el--mod--value.is-active');


			expect(entity.selector.value).toBe('.block__el--mod--value.is-active');
			expect(entity.selector.startIndex).toBe(0);
			expect(entity.selector.endIndex).toBe(entity.selector.value.length);

			expect(entity.block?.value).toBe('block');
			expect(entity.element?.value).toBe('el');
			expect(entity.modifierName?.value).toBe('mod');
			expect(entity.modifierValue?.value).toBe('value');
			expect(entity.utility?.[0].value).toBe('is-active');
		});
	});

	describe('Indices', () => {
		it('Resolves entity indices for complex selector without nesting', () => {
			const entity = resolveWith(`.block__el--mod--val.util-1.util-2 {}`)[0];

			expect(entity.selector?.value).toBe('.block__el--mod--val.util-1.util-2');
			expect(entity.selector?.startIndex).toBe(0);
			expect(entity.selector?.endIndex).toBe(entity.selector?.value.length);

			expect(entity.block?.value).toBe('block');
			expect(entity.block?.startIndex).toBe(1);

			expect(entity.element?.value).toBe('el');
			expect(entity.element?.startIndex).toBe(8);
			expect(entity.element?.endIndex).toBe(10);

			expect(entity.modifierName?.value).toBe('mod');
			expect(entity.modifierName?.startIndex).toBe(12);
			expect(entity.modifierName?.endIndex).toBe(15);

			expect(entity.modifierValue?.value).toBe('val');
			expect(entity.modifierValue?.startIndex).toBe(17);
			expect(entity.modifierValue?.endIndex).toBe(20);

			expect(entity.utility?.[0].value).toBe('util-1');
			expect(entity.utility?.[0].startIndex).toBe(21);
			expect(entity.utility?.[0].endIndex).toBe(27);

			expect(entity.utility?.[1].value).toBe('util-2');
			expect(entity.utility?.[1].startIndex).toBe(28);
			expect(entity.utility?.[1].endIndex).toBe(34);
		});

		it('Resolves entity indices for complex compound selector without nesting', () => {
			const entity = resolveWith(`
				.block__el--mod--val.util-1.util-2,
				.foo-bar__el.util-1 {}
			`)[1];

			expect(entity.selector?.value).toBe('.foo-bar__el.util-1');
			expect(entity.selector?.startIndex).toBe(40);
			expect(entity.selector?.endIndex).toBe(40 + entity.selector?.value.length);

			expect(entity.block?.value).toBe('foo-bar');
			expect(entity.block?.startIndex).toBe(1);
			expect(entity.block?.endIndex).toBe(8);

			expect(entity.element?.value).toBe('el');
			expect(entity.element?.startIndex).toBe(10);
			expect(entity.element?.endIndex).toBe(12);

			expect(entity.utility?.[0].value).toBe('util-1');
			expect(entity.utility?.[0].startIndex).toBe(13);
			expect(entity.utility?.[0].endIndex).toBe(19);
		});

		it('Resolves entity indices for complex compound selector using nesting', () => {
			const root = parse(`
				.block {
					&__el {
						&--mod, .foo-bar__el.util-1.util-2 {}
					}
				}
			`);
			// .block__el--mod, .foo-bar__el--mod.util-1.util-2

			// @ts-expect-error -- Trust me it exists
			const entity = resolveBemEntities(root.nodes[0].nodes[0].nodes[0], styles.TWO_DASH)[1];

			expect(entity.selector?.value).toBe('.foo-bar__el.util-1.util-2');
			expect(entity.selector?.startIndex).toBe(17);
			expect(entity.selector?.endIndex).toBe(43);

			expect(entity.block?.value).toBe('foo-bar');
			expect(entity.block?.startIndex).toBe(1);
			expect(entity.block?.endIndex).toBe(8);

			expect(entity.element?.value).toBe('el');
			expect(entity.element?.startIndex).toBe(10);
			expect(entity.element?.endIndex).toBe(12);

			expect(entity.utility?.[0].value).toBe('util-1');
			expect(entity.utility?.[0].startIndex).toBe(13);
			expect(entity.utility?.[0].endIndex).toBe(19);

			expect(entity.utility?.[1].value).toBe('util-2');
			expect(entity.utility?.[1].startIndex).toBe(20);
			expect(entity.utility?.[1].endIndex).toBe(26);
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

			it(`Resolves a BEM block followed by utilities or pseudo-classes/pseudo-elements`, () => {
				expect(resolveWith(`.the-component:hover {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component::placeholder {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component.is-active {}`)[0].block.value).toBe('the-component');
				expect(resolveWith(`.the-component.is-active.is-disabled {}`)[0].block.value).toBe('the-component');
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

		describe('Utilities', () => {
			it(`Returns undefined when no utilities are present`, () => {
				expect(resolveWith(`.the-component {}`)[0].utility).toBeUndefined();
				expect(resolveWith(`.the-component__element {}`)[0].utility).toBeUndefined();
				expect(resolveWith(`.the-component--modifier {}`)[0].utility).toBeUndefined();
				expect(resolveWith(`.the-component--modifier--value {}`)[0].utility).toBeUndefined();
				expect(resolveWith(`.the-component:hover {}`)[0].utility).toBeUndefined();
				expect(resolveWith(`.the-component::placeholder {}`)[0].utility).toBeUndefined();
			});

			it(`Resolves single utility after block`, () => {
				expect(resolveWith(`.the-component.is-active {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component__element.is-active {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component--modifier.is-active {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component--modifier--value.is-active {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component--modifier--value.--active {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['--active']);
			});

			it(`Resolves multiple utilities after block`, () => {
				expect(resolveWith(`.the-component.is-active.is-disabled {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active', 'is-disabled']);
				expect(resolveWith(`.the-component__element.is-active.is-disabled {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active', 'is-disabled']);
				expect(resolveWith(`.the-component--modifier.is-active.is-disabled {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active', 'is-disabled']);
				expect(resolveWith(`.the-component--modifier--value.-active.--disabled {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['-active', '--disabled']);
			});

			it(`Ignores pseudo-classes and pseudo-elements when extracting utilities`, () => {
				expect(resolveWith(`.the-component.is-active:hover {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component__element.is-active::placeholder {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component--modifier.is-active:hover {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolveWith(`.the-component--modifier--value.is-active::placeholder {}`)[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
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

			it(`Resolves multiple utilities within a compound selector`, () => {
				const resolved = resolveWith(`
					.the-component.is-active .the-component__element.is-disabled.is-visible,
					.the-component.js-modal .bar-component {}
				`);

				expect(resolved[0].utility?.map((u) => u.value)).toStrictEqual(['is-active']);
				expect(resolved[1].utility?.map((u) => u.value)).toStrictEqual(['is-disabled', 'is-visible']);
				expect(resolved[2].utility?.map((u) => u.value)).toStrictEqual(['js-modal']);
				expect(resolved[3].utility).toBeUndefined();
			});
		});
	});

	describe('React style', () => {
		describe('Block', () => {
			it(`Resolves BEM block followed by element`, () => {
				expect(resolveWith(`.theComponent-element {}`, 'REACT')[0].block?.value).toBe('theComponent');
				expect(resolveWith(`.TheComponent-element {}`, 'REACT')[0].block?.value).toBe('TheComponent');
			});

			it(`Resolves BEM block followed by modifier`, () => {
				expect(resolveWith(`.theComponent_modifier {}`, 'REACT')[0].block?.value).toBe('theComponent');
				expect(resolveWith(`.TheComponent_modifier_value {}`, 'REACT')[0].block?.value).toBe('TheComponent');
			});
		});

		describe('Element', () => {
			it(`Resolves BEM element`, () => {
				expect(resolveWith(`.theComponent-element {}`, 'REACT')[0].element?.value).toBe('element');
				expect(resolveWith(`.theComponent-elementFoo {}`, 'REACT')[0].element?.value).toBe('elementFoo');
				expect(resolveWith(`.theComponent-ElementFoo {}`, 'REACT')[0].element?.value).toBe('ElementFoo');
				expect(resolveWith(`.theComponent-ElementFoo_modifier {}`, 'REACT')[0].element?.value).toBe('ElementFoo');
				expect(resolveWith(`.theComponent-ElementFoo_modifier_value {}`, 'REACT')[0].element?.value).toBe('ElementFoo');
			});
		});

		describe('Modifier Name', () => {
			it(`Resolves BEM modifier for block`, () => {
				expect(resolveWith(`.theComponent_modifier {}`, 'REACT')[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.theComponent_modifierFoo {}`, 'REACT')[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.theComponent_modifier-foo {}`, 'REACT')[0].modifierName?.value).toBe('modifier-foo');
			});

			it(`Resolves BEM modifier for element`, () => {
				expect(resolveWith(`.theComponent-element_modifier {}`, 'REACT')[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.theComponent-elementFoo_modifierFoo {}`, 'REACT')[0].modifierName?.value).toBe('modifierFoo');
			});
		});

		describe('Modifier Value', () => {
			it(`Resolves BEM modifier value for block`, () => {
				expect(resolveWith(`.theComponent_modifier_value {}`, 'REACT')[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.theComponent_modifier_value-foo {}`, 'REACT')[0].modifierValue?.value).toBe('value-foo');
			});

			it(`Resolves BEM modifier value for element`, () => {
				expect(resolveWith(`.theComponent-element_modifier_value {}`, 'REACT')[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.theComponent-element-foo_modifier_valueFoo {}`, 'REACT')[0].modifierValue?.value).toBe('valueFoo');
			});
		});
	});

	describe('Traditional style', () => {
		describe('Block', () => {
			it(`Resolves BEM block followed by modifier`, () => {
				expect(resolveWith(`.the-component_modifier {}`, 'TRADITIONAL')[0].block?.value).toBe('the-component');
				expect(resolveWith(`.the-component_modifier_value {}`, 'TRADITIONAL')[0].block?.value).toBe('the-component');
			});
		});

		describe('Modifier Name', () => {
			it(`Resolves BEM modifier for block`, () => {
				expect(resolveWith(`.the-component_modifier {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component_modifierFoo {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.the-component_modifier-foo {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifier-foo');
			});

			it(`Resolves BEM modifier for element`, () => {
				expect(resolveWith(`.the-component__element_modifier {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifier');
				expect(resolveWith(`.the-component__elementFoo_modifierFoo {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifierFoo');
				expect(resolveWith(`.the-component__elementFoo_modifier-foo {}`, 'TRADITIONAL')[0].modifierName?.value).toBe('modifier-foo');
			});
		});

		describe('Modifier Value', () => {
			it(`Resolves BEM modifier value for block`, () => {
				expect(resolveWith(`.the-component_modifier_value {}`, 'TRADITIONAL')[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component_modifier_value-foo {}`, 'TRADITIONAL')[0].modifierValue?.value).toBe('value-foo');
			});

			it(`Resolves BEM modifier value for element`, () => {
				expect(resolveWith(`.the-component__element_modifier_value {}`, 'TRADITIONAL')[0].modifierValue?.value).toBe('value');
				expect(resolveWith(`.the-component__element-foo_modifier_valueFoo {}`, 'TRADITIONAL')[0].modifierValue?.value).toBe('valueFoo');
			});
		});
	});
});
