import rule from '../no-misplaced-side-effects';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });
const testCssRule = createTestRule({ ruleName });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'Accepts side-effects declared within the target element',
			code: `
				.block {
					$b: #{&};

					&__label {
						#{$b}__link:hover & {}
					}
				}
			`,
		},
		{
			description: 'Treats a modifier as a separate owner',
			code: `
				.block {
					$b: #{&};

					&__item {
						&--active {
							#{$b}:hover & {}
						}
					}
				}
			`,
		},
		{
			description: 'Accepts relations between the same BEM entity',
			code: `
				.block {
					&__item {
						&:hover + & {}
						& & {}
					}
				}
			`,
		},
		{
			description: 'Does not treat a contextual root block declaration as a side-effect',
			code: `html .block {}`,
		},
		{
			description: 'Uses the most specific modifier in a compound owner',
			code: `
				.block__item.block__item--active {
					.block:hover & {}
				}
			`,
		},
		{
			description: 'Treats a modifier value as part of the owner',
			code: `
				.block__item--theme--dark {
					.block:hover & {}
				}
			`,
		},
		{
			description: 'Keeps target ownership through `@at-root` and `@nest`',
			code: `
				.block__label {
					@at-root .block__link:hover & {}
					@nest .block__link:focus & {}
				}
			`,
		},
		{
			description: 'Does not repeat an inherited side-effect for nested states',
			code: `
				.block__label {
					.block__link:hover & {
						&:focus {}
					}
				}
			`,
		},
		{
			description: 'Ignores non-BEM and ambiguous targets',
			code: `
				.block__link {
					&:hover span {}
					&:hover .is-active {}
					&:hover :is(.block__label, .block__icon) {}
				}
			`,
		},
		{
			description: 'Ignores unresolved interpolation',
			code: `
				.block__link {
					&:hover #{$unknown} {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports the issue example with styles owned by the source element',
			code: `
				.block {
					$b: #{&};

					&__link {
						&:hover #{$b}__label {}
					}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block__link'),
					line: 5, column: 11,
					endLine: 5, endColumn: 23,
				},
			],
		},
		{
			description: 'Reports an element nested within a block state',
			code: `
				.block {
					&:hover {
						.block__label {}
					}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block'),
					line: 3, column: 3,
					endLine: 3, endColumn: 16,
				},
			],
		},
		{
			description: 'Requires modifier styles to be nested within the modifier',
			code: `
				.block {
					$b: #{&};

					&__item {
						#{$b}:hover &--active {}
					}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__item--active', '.block__item'),
					line: 5, column: 15,
					endLine: 5, endColumn: 24,
				},
			],
		},
		{
			description: 'Requires base element styles to leave modifier ownership',
			code: `
				.block__item--active {
					&:hover .block__item {}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__item', '.block__item--active'),
					line: 2, column: 10,
					endLine: 2, endColumn: 22,
				},
			],
		},
		{
			description: 'Reports detached flat side-effects',
			code: `
				.block__link:hover .block__label {}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', undefined),
					line: 1, column: 20,
					endLine: 1, endColumn: 33,
				},
			],
		},
		{
			description: 'Does not mistake the first contextual element for a root block definition',
			code: `.theme:hover .block__label {}`,
			warnings: [
				{
					message: messages.misplaced('.block__label', undefined),
					line: 1, column: 14,
					endLine: 1, endColumn: 27,
				},
			],
		},
		{
			description: 'Reports misplaced ownership through `@at-root`',
			code: `
				.block__link {
					@at-root &:hover .block__label {}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block__link'),
					line: 2, column: 19,
					endLine: 2, endColumn: 32,
				},
			],
		},
		{
			description: 'Reports each misplaced selector-list branch',
			code: `
				.block__link {
					&:hover .block__label,
					&:focus .block__icon {}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block__link'),
					line: 2, column: 10,
					endLine: 2, endColumn: 23,
				},
				{
					message: messages.misplaced('.block__icon', '.block__link'),
					line: 3, column: 10,
					endLine: 3, endColumn: 22,
				},
			],
		},
		{
			description: 'Reports only the authored nested side-effect',
			code: `
				.block__link {
					&:hover .block__label {
						&:focus {}
					}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block__link'),
					line: 2, column: 10,
					endLine: 2, endColumn: 23,
				},
			],
		},
	],
});

testRule({
	description: 'Custom separators',
	config: [true, {
		separators: {
			element: '--',
			modifier: '_',
			modifierValue: '_',
		},
	}],
	accept: [
		{
			description: 'Recognizes target ownership with custom separators',
			code: `
				.block--label {
					.block--link:hover & {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports misplaced ownership with custom separators',
			code: `
				.block--link {
					&:hover .block--label {}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block--label', '.block--link'),
					line: 2, column: 10,
					endLine: 2, endColumn: 23,
				},
			],
		},
	],
});

testRule({
	description: 'Custom messages',
	config: [true, {
		messages: {
			misplaced: (target: string, owner: string | undefined) => `Move ${target} from ${owner ?? 'root'}`,
		},
	}],
	reject: [
		{
			code: `.block {} .block__link:hover .block__label {}`,
			warnings: [
				{
					message: `Move .block__label from root (@morev/bem/no-misplaced-side-effects)`,
					line: 1, column: 30,
					endLine: 1, endColumn: 43,
				},
			],
		},
	],
});

testCssRule({
	description: 'Native CSS nesting',
	config: [true],
	accept: [
		{
			description: 'Accepts target-owned CSS nesting',
			codeFilename: 'block.css',
			code: `
				.block__label {
					.block__link:hover & {}
				}
			`,
		},
		{
			description: 'Keeps ownership through nested group rules',
			codeFilename: 'block.css',
			code: `
				@media (width >= 320px) {
					.block__label {
						.block__link:hover & {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports misplaced native CSS nesting',
			codeFilename: 'block.css',
			code: `
				.block__link {
					&:hover .block__label {}
				}
			`,
			warnings: [
				{
					message: messages.misplaced('.block__label', '.block__link'),
					line: 2, column: 10,
					endLine: 2, endColumn: 23,
				},
			],
		},
	],
});
