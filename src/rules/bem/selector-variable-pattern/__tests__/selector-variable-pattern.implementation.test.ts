import rule from '../selector-variable-pattern';
import type {
	SelectorVariablePatternContext,
	SelectorVariablePatternResolver,
} from '../selector-variable-pattern.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

const resolveElement: SelectorVariablePatternResolver = ({ selector, variable }) => {
	return variable.reference === 'variable' ? null : selector.element;
};

testRule({
	description: 'Resolver context',
	config: [true, {
		resolve: (context: SelectorVariablePatternContext) => {
			expect(context).toStrictEqual({
				selector: {
					value: '.block__item:hover',
					bemSelector: '.block__item',
					block: 'block',
					element: 'item',
					modifierName: null,
					modifierValue: null,
				},
				variable: {
					name: 'wrong',
					value: "'#{&}__item:hover'",
					reference: null,
				},
				owner: {
					selector: '.block',
					block: 'block',
					depth: 1,
					path: ['.block'],
				},
			});

			return 'item';
		},
	}],
	reject: [
		{
			description: 'Passes a flat DTO with unambiguous BEM parts',
			code: `
				.block {
					$wrong: '#{&}__item:hover';
				}
			`,
			warnings: [
				{
					message: messages.invalidName('wrong', 'item', {
						selector: {
							value: '.block__item:hover',
							bemSelector: '.block__item',
							block: 'block',
							element: 'item',
							modifierName: null,
							modifierValue: null,
						},
						variable: {
							name: 'wrong',
							value: "'#{&}__item:hover'",
							reference: null,
						},
						owner: {
							selector: '.block',
							block: 'block',
							depth: 1,
							path: ['.block'],
						},
					}),
					line: 2, column: 2,
					endLine: 2, endColumn: 8,
				},
			],
		},
	],
});

testRule({
	description: 'Default resolver',
	config: true,
	accept: [
		{
			description: 'Skips variables declared at the stylesheet root',
			code: `$wrong: '.block__item';`,
		},
		{
			description: 'Requires a plain element variable to match the element name',
			code: `
				.block {
					$item: #{&}__item;
				}
			`,
		},
		{
			description: 'Requires a modified element variable to contain the element name',
			code: `
				.block {
					$item: #{&}__item--active;
					$item-any-name: #{&}__item--size--large;
				}
			`,
		},
		{
			description: 'Skips non-selector values, blocks, and elements from another block',
			code: `
				.block {
					$size: 20px;
					$debug: true;
					$color: #fff;
					$label: 'Submit';
					$empty: null;
					$sizes: (20px, 40px);
					$options: (debug: true, size: 20px);
					$anything: #{&};
					$foreign: '.foreign__item';
				}
			`,
		},
		{
			description: 'Skips variables declared in nested selectors',
			code: `
				.block {
					&__wrapper {
						$wrong: '.block__item';
					}
				}
			`,
		},
		{
			description: 'Skips aliases to another variable',
			code: `
				.block {
					$item: #{&}__item;
					$wrong: $item;
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports and renames a mismatching plain element variable',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			fixed: `
				.block {
					$item: #{&}__item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
		{
			description: 'Reports a modified element variable that omits the element name',
			code: `
				.block {
					$active: #{&}__item--active;
				}
			`,
			fixed: `
				.block {
					$active: #{&}__item--active;
				}
			`,
			warnings: [{
				message: `Expected variable "$active" to match "/item/" for BEM selector ".block__item--active". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 9,
			}],
		},
	],
});

testRule({
	description: 'Exact names',
	config: [true, { resolve: resolveElement }],
	accept: [
		{
			description: 'Accepts a matching element variable',
			code: `
				.block {
					$item: #{&}__item;
				}
			`,
		},
		{
			description: 'Resolves sequential declarations and split literal fragments',
			code: `
				.block {
					$b: #{&};
					$item: $b + '__it' + 'em';
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports a mismatching element variable',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			fixed: `
				.block {
					$item: #{&}__item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'Empty string differs from nullish resolver results',
	config: [true, { resolve: () => '' }],
	reject: [
		{
			description: 'Treats an empty string as an exact name without applying an invalid fix',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			fixed: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'BEM entity parts',
	config: [true, {
		resolve: ({ selector, owner }: SelectorVariablePatternContext) => {
			if (owner && selector.block !== owner.block) return /^external/;

			return [
				!selector.element && `block-${selector.block}`,
				selector.element,
				selector.modifierName && 'mod',
				selector.modifierName,
				selector.modifierValue,
			].filter(Boolean).join('-');
		},
	}],
	accept: [
		{
			description: 'Supports entity parts and allows any external-prefixed name for another block',
			code: `
				.block {
					$block-block: '.block';
					$external-anything: '.foreign';
					$item: #{&}__item;
					$external-whatever: '.foreign__item';
					$item-mod-active: #{&}__item--active;
					$item-mod-size-large: #{&}__item--size--large;
				}
			`,
		},
	],
	reject: [
		{
			description: 'Requires an external prefix for a block from another owner',
			code: `
				.block {
					$block-foreign: '.foreign';
				}
			`,
			fixed: `
				.block {
					$block-foreign: '.foreign';
				}
			`,
			warnings: [{
				message: `Expected variable "$block-foreign" to match "/^external/" for BEM selector ".foreign". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 16,
			}],
		},
		{
			description: 'Requires an external prefix for an element from another owner',
			code: `
				.block {
					$item: '.foreign__item';
				}
			`,
			fixed: `
				.block {
					$item: '.foreign__item';
				}
			`,
			warnings: [{
				message: `Expected variable "$item" to match "/^external/" for BEM selector ".foreign__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 7,
			}],
		},
	],
});

testRule({
	description: 'Foreign blocks',
	config: [true, {
		resolve: ({ selector, owner }: SelectorVariablePatternContext) => {
			if (!owner) return;

			expect(owner.block).toBe('block');

			if (selector.block === owner.block) return selector.element;

			expect(selector.block).toBe('foreign');

			return null;
		},
	}],
	accept: [
		{
			description: 'Lets the resolver skip a BEM selector from another block',
			code: `
				.block {
					$foreign-item: '.foreign__item';
				}
			`,
		},
	],
	reject: [
		{
			description: 'Checks a BEM selector from the owner block',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			fixed: `
				.block {
					$item: #{&}__item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'Contextual selectors',
	config: [true, {
		resolve: ({ selector }: SelectorVariablePatternContext) => {
			if (!selector.element) return;

			expect(selector.value).toBe('.block__item:hover');
			expect(selector.bemSelector).toBe('.block__item');

			return selector.value.endsWith(':hover')
				? `${selector.element}-hover`
				: selector.element;
		},
	}],
	accept: [
		{
			description: 'Lets the resolver use syntax outside the BEM entity',
			code: `
				.block {
					$item-hover: '#{&}__item:hover';
				}
			`,
		},
	],
});

testRule({
	description: 'Regular expression results',
	config: [true, {
		resolve: () => /^item$/g,
	}],
	accept: [
		{
			description: 'Resets stateful patterns between variables',
			code: `
				.first {
					$item: '.first__item';
				}

				.second {
					$item: '.foo__item';
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports a name that does not match the pattern without fixing it',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			fixed: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to match "/^item$/g" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'Nullish resolver results',
	config: [true, {
		resolve: ({ selector }: SelectorVariablePatternContext) => {
			if (selector.element === 'item') return null;
			if (selector.element === 'icon') return;

			return selector.element;
		},
	}],
	accept: [
		{
			description: 'Skips variables for null and undefined results',
			code: `
				.block {
					$first: #{&}__item;
					$second: #{&}__icon;
				}
			`,
		},
	],
	reject: [
		{
			description: 'Checks variables for non-nullish results',
			code: `
				.block {
					$first: #{&}__item;
					$second: #{&}__icon;
					$wrong: #{&}__label;
				}
			`,
			fixed: `
				.block {
					$first: #{&}__item;
					$second: #{&}__icon;
					$label: #{&}__label;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$label" for BEM selector ".block__label". (${ruleName})`,
				line: 4, column: 2,
				endLine: 4, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'Variable reference kinds',
	config: [true, {
		resolve: ({ variable }: SelectorVariablePatternContext) => {
			if (variable.name === 'item') {
				expect(variable.reference).toBeNull();

				return null;
			}

			if (variable.name.includes('alias')) {
				expect(variable.reference).toBe('variable');

				return null;
			}

			expect(variable.reference).toBe('self');

			return 'self';
		},
	}],
	accept: [
		{
			description: 'Distinguishes aliases from a reference to the current context',
			code: `
				.block {
					$item: #{&}__item;
					$alias: $item;
					$interpolated-alias: #{$item};

					&__element {
						$self: #{&};
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Lets the resolver require self for a reference to the current context',
			code: `
				.block {
					&__element {
						$wrong: #{&};
					}
				}
			`,
			fixed: `
				.block {
					&__element {
						$self: #{&};
					}
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$self" for BEM selector ".block__element". (${ruleName})`,
				line: 3, column: 3,
				endLine: 3, endColumn: 9,
			}],
		},
	],
});

testRule({
	description: 'Ambiguous selectors',
	config: [true, {
		resolve: () => {
			throw new Error('Unexpected resolver call');
		},
	}],
	accept: [
		{
			description: 'Skips selector lists and values containing multiple BEM entities',
			code: `
				.block {
					$list: '.a__item, .b__icon';
					$chain: '.block__item .block__icon';
				}
			`,
		},
		{
			description: 'Skips unresolved variables',
			code: `
				.block {
					$unresolved: #{$late}__item;
					$late: 20px;
				}
			`,
		},
	],
});

testRule({
	description: 'Owner path',
	config: [true, {
		resolve: ({ owner, selector }: SelectorVariablePatternContext) => {
			if (!owner) {
				expect(owner).toBeNull();

				return;
			}

			if (owner.depth > 1) {
				expect(owner).toStrictEqual({
					selector: '.block__wrapper',
					block: 'block',
					depth: 2,
					path: ['.block', '&__wrapper'],
				});

				return;
			}

			expect(owner).toStrictEqual({
				selector: '.block',
				block: 'block',
				depth: 1,
				path: ['.block'],
			});

			return selector.element;
		},
	}],
	accept: [
		{
			description: 'Represents a stylesheet-root declaration without an owner',
			code: `$anything: '.block__item';`,
		},
		{
			description: 'Lets the resolver ignore variables using their authored selector path',
			code: `
				.block {
					&__wrapper {
						$wrong: '.block__item';
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Treats a top-level selector inside an at-rule as depth one',
			code: `
				@media (width > 1px) {
					.block {
						$wrong: #{&}__item;
					}
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 3, column: 3,
				endLine: 3, endColumn: 9,
			}],
		},
	],
});

testRule({
	description: 'Custom separators',
	config: [true, {
		resolve: ({ selector }: SelectorVariablePatternContext) => {
			if (!selector.element || !selector.modifierName) return;

			expect(selector).toMatchObject({
				block: 'block',
				element: 'item',
				modifierName: 'active',
			});

			return `${selector.element}-${selector.modifierName}`;
		},
		separators: {
			element: '--',
			modifier: '_',
			modifierValue: '_',
		},
	}],
	accept: [
		{
			description: 'Uses custom separators to build the selector DTO',
			code: `
				.block {
					$item-active: #{&}--item_active;
				}
			`,
		},
	],
});

testRule({
	description: 'Exact-name autofix',
	config: [true, { resolve: resolveElement }],
	reject: [
		{
			description: 'Renames an exact variable and its local references',
			code: `
				.block {
					$wrong: #{&}__item;
					$alias: $wrong;

					#{$wrong} & {
						--selector: "#{$wrong}";
					}
				}
			`,
			fixed: `
				.block {
					$item: #{&}__item;
					$alias: $item;

					#{$item} & {
						--selector: "#{$item}";
					}
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
		{
			description: 'Normalizes SASS-equivalent references during a safe rename',
			code: `
				.block {
					$menu_item: #{&}__menu-item;
					$alias: $menu_item;

					#{$menu-item} & {}
				}
			`,
			fixed: `
				.block {
					$menu-item: #{&}__menu-item;
					$alias: $menu-item;

					#{$menu-item} & {}
				}
			`,
			warnings: [{
				message: `Expected variable "$menu_item" to be named "$menu-item" for BEM selector ".block__menu-item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 12,
			}],
		},
		{
			description: 'Does not rename when the target name already has a binding',
			code: `
				.block {
					$item: red;
					$wrong: #{&}__item;
					color: $item;
				}
			`,
			fixed: `
				.block {
					$item: red;
					$wrong: #{&}__item;
					color: $item;
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 3, column: 2,
				endLine: 3, endColumn: 8,
			}],
		},
		{
			description: 'Does not rename across a callable parameter binding',
			code: `
				.block {
					$wrong: #{&}__item;

					@mixin render($wrong) {
						color: $wrong;
					}
				}
			`,
			fixed: `
				.block {
					$wrong: #{&}__item;

					@mixin render($wrong) {
						color: $wrong;
					}
				}
			`,
			warnings: [{
				message: `Expected variable "$wrong" to be named "$item" for BEM selector ".block__item". (${ruleName})`,
				line: 2, column: 2,
				endLine: 2, endColumn: 8,
			}],
		},
	],
});

testRule({
	description: 'Custom messages',
	config: [true, {
		resolve: resolveElement,
		messages: {
			invalidName: (
				actual: string,
				expected: string | RegExp,
				context: SelectorVariablePatternContext,
			) => {
				return `Invalid ${actual}; expected ${expected} for ${context.selector.bemSelector}`;
			},
		},
	}],
	reject: [
		{
			description: 'Provides the resolver result and DTO to the message callback',
			code: `
				.block {
					$wrong: #{&}__item;
				}
			`,
			warnings: [
				{
					message: 'Invalid wrong; expected item for .block__item (@morev/bem/selector-variable-pattern)',
					line: 2, column: 2,
					endLine: 2, endColumn: 8,
				},
			],
		},
	],
});
