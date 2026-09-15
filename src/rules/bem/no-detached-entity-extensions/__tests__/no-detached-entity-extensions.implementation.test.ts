import rule from '../no-detached-entity-extensions';

const { ruleName, messages } = rule;
const testRule = createTestRule({
	ruleName,
	customSyntax: 'postcss-scss',
});
const testCssRule = createTestRule({ ruleName });

testRule({
	description: 'SCSS entity extension ownership',
	config: [true],
	accept: [
		{
			description: 'Accepts local extensions nested within their BEM entity',
			code: `
				.block {
					&:hover {}
					&::before {}
					&[aria-busy='true'] {}
					&.is-loading {}

					&__title {
						&:focus-visible {}
						&::placeholder {}
						&[aria-current='true'] {}
						&.is-active {}
					}
				}
			`,
		},
		{
			description: 'Accepts modifiers and both modifier value nesting styles',
			code: `
				.block {
					&__title {
						&--active {}
						&--theme--dark {}

						&--theme {
							&--light {}
						}
					}
				}
			`,
		},
		{
			description: 'Requires states of modifiers to remain within the complete modifier',
			code: `
				.block {
					&__item {
						&--active {
							&:hover {}
							&::before {}
							&[aria-current='true'] {}
						}
					}
				}
			`,
		},
		{
			description: 'Accepts modifiers combined with their base entities',
			code: `
				.block__item {
					&.block__item--active {}
					&.block__item--theme--dark {}

					&--theme {
						&.block__item--theme--dark {}
					}
				}
			`,
		},
		{
			description: 'Accepts selector lists and conditional wrappers within their owner',
			code: `
				.block__title {
					&:hover,
					&:focus-visible {}

					@media (width > 640px) {
						&[data-size='wide'] {}
					}

					@at-root &:active {}
				}
			`,
		},
		{
			description: 'Accepts local extensions inherited by every grouped owner',
			code: `
				.block {
					&__title,
					&__label {
						&:hover {}
					}
				}
			`,
		},
		{
			description: 'Leaves relational selectors to the relational ownership rule',
			code: `
				.block__link:hover .block__label {}
				.theme .block__label:hover {}

				.block__label {
					.block__link:hover & {}
				}
			`,
		},
		{
			description: 'Ignores keyframes and unresolved or ambiguous selectors',
			code: `
				.block {}

				.block {
					@keyframes pulse {
						from { opacity: 0; }
						to { opacity: 1; }
					}

					#{$unknown}__title:hover {}
					&__title.block__label:hover {}
					&__title:is(.is-active, .is-current) {}
					&__title:nth-child(2n of :is(.is-active, .is-current)):hover {}
				}

				:is(.block__title, .block__label) {
					@at-root .block__target:hover {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Reports detached extensions and modifiers from the issue example',
			code: `
				.block {
					&__title {}

					&__title:hover {}
					&__title::placeholder {}
					&__title[aria-current='true'] {}
					&__title.is-active {}
					&__title--active {}
					&__title--theme--dark {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__title:hover', '.block__title'),
					line: 4, column: 2,
					endLine: 4, endColumn: 16,
				},
				{
					message: messages.detached('.block__title::placeholder', '.block__title'),
					line: 5, column: 2,
					endLine: 5, endColumn: 23,
				},
				{
					message: messages.detached(".block__title[aria-current='true']", '.block__title'),
					line: 6, column: 2,
					endLine: 6, endColumn: 31,
				},
				{
					message: messages.detached('.block__title.is-active', '.block__title'),
					line: 7, column: 2,
					endLine: 7, endColumn: 20,
				},
				{
					message: messages.detached('.block__title--active', '.block__title'),
					line: 8, column: 2,
					endLine: 8, endColumn: 18,
				},
				{
					message: messages.detached('.block__title--theme--dark', '.block__title'),
					line: 9, column: 2,
					endLine: 9, endColumn: 23,
				},
			],
		},
		{
			description: 'Reports detached root block extensions',
			code: `
				.block:hover {}
				.block::before {}
			`,
			warnings: [
				{
					message: messages.detached('.block:hover', '.block'),
					line: 1, column: 1,
					endLine: 1, endColumn: 13,
				},
				{
					message: messages.detached('.block::before', '.block'),
					line: 2, column: 1,
					endLine: 2, endColumn: 15,
				},
			],
		},
		{
			description: 'Reports states declared directly on a modifier extension',
			code: `
				.block {
					&__item {
						&--active:hover {}
						&--theme--dark[aria-current='true'] {}
					}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__item--active:hover', '.block__item--active'),
					line: 3, column: 3,
					endLine: 3, endColumn: 18,
				},
				{
					message: messages.detached(".block__item--theme--dark[aria-current='true']", '.block__item--theme--dark'),
					line: 4, column: 3,
					endLine: 4, endColumn: 38,
				},
			],
		},
		{
			description: 'Still treats a modifier as the owner of its actual extensions',
			code: `
				.block__item {
					&.block__item--active:hover {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__item.block__item--active:hover', '.block__item--active'),
					line: 2, column: 2,
					endLine: 2, endColumn: 29,
				},
			],
		},
		{
			description: 'Reports detached selector-list branches independently',
			code: `
				.block {
					&__title:hover,
					&__label::before {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__title:hover', '.block__title'),
					line: 2, column: 2,
					endLine: 2, endColumn: 16,
				},
				{
					message: messages.detached('.block__label::before', '.block__label'),
					line: 3, column: 2,
					endLine: 3, endColumn: 18,
				},
			],
		},
		{
			description: 'Reports only extended branches in a mixed selector list',
			code: `
				.block {
					&__title,
					&__label:hover {}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__label:hover', '.block__label'),
					line: 3, column: 2,
					endLine: 3, endColumn: 16,
				},
			],
		},
		{
			description: 'Preserves authored ranges and lexical ownership through SCSS constructs',
			code: `
				.block {
					$b: #{&};

					@at-root #{$b}__title:hover {}

					&__label {
						@at-root .block__title:focus {}
					}
				}
			`,
			warnings: [
				{
					message: messages.detached('.block__title:hover', '.block__title'),
					line: 4, column: 11,
					endLine: 4, endColumn: 29,
				},
				{
					message: messages.detached('.block__title:focus', '.block__title'),
					line: 7, column: 12,
					endLine: 7, endColumn: 31,
				},
			],
		},
	],
});

testCssRule({
	description: 'Native CSS entity extension ownership',
	codeFilename: 'component.css',
	config: [true],
	accept: [
		{
			description: 'Accepts native nesting and standalone modifier selectors',
			codeFilename: undefined,
			code: `
				.block__title {
					&:hover {}
					&::before {}
					&[aria-current='true'] {}
					&.is-active {}
				}

				.block__title--active {
					&:hover {}
				}

				.block__title--theme--dark {}
			`,
		},
	],
	reject: [
		{
			description: 'Reports detached native CSS extensions but allows standalone modifiers',
			code: `
				.block__title--active {}
				.block__title--theme--dark {}
				.block__title:hover {}
				.block__title--active::before {}
			`,
			warnings: [
				{
					message: messages.detached('.block__title:hover', '.block__title'),
					line: 3, column: 1,
					endLine: 3, endColumn: 20,
				},
				{
					message: messages.detached('.block__title--active::before', '.block__title--active'),
					line: 4, column: 1,
					endLine: 4, endColumn: 30,
				},
			],
		},
	],
});

testRule({
	description: 'Secondary options',
	config: [true, {
		messages: {
			detached: (extension: string, owner: string) => `Move ${extension} into ${owner}`,
		},
		separators: {
			element: '___',
			modifier: '_',
			modifierValue: '-',
		},
	}],
	reject: [
		{
			description: 'Uses custom separators and messages',
			code: `
				.block {
					&___title_state-primary:hover {}
				}
			`,
			warnings: [
				{
					message: 'Move .block___title_state-primary:hover into .block___title_state-primary (@morev/bem/no-detached-entity-extensions)',
					line: 2, column: 2,
					endLine: 2, endColumn: 31,
				},
			],
		},
	],
});
