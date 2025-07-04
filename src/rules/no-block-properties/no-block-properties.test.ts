import rule from './no-block-properties';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'No external geometry in the component',
			code: `
				.the-component {
					color: red;
				}
			`,
		},
		{
			description: 'External geometry property in Element or its modifier',
			code: `
				.the-component {
					color: red;

					&__element {
						margin-block-start: 16px;

						&--element-modifier {
							margin-block-start: 8px;
						}
					}
				}
			`,
		},
		{
			description: 'External geometry property in a nested rule',
			code: `
				.the-component {
					.another-component { margin-block-start: 16px; }
					img { margin-block-start: 16px; }
				}
			`,
		},
	],
	reject: [
		{
			description: 'Block has an external geometry property',
			code: `
				.the-component {
					margin-block-start: 16px;
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start'),
					line: 2, column: 2,
					endLine: 2, endColumn: 20,
				},
			],
		},
		{
			description: 'Block modifier has an external geometry property',
			code: `
				.the-component {
					&--modifier {
						margin-block-start: 16px;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start'),
					line: 3, column: 3,
					endLine: 3, endColumn: 21,
				},
			],
		},
		{
			description: 'Block modifier has an external geometry property inside pseudo-class O_o',
			code: `
				.the-component {
					&:hover {
						margin-block-start: 16px;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('margin-block-start'),
					line: 3, column: 3,
					endLine: 3, endColumn: 21,
				},
			],
		},
	],
});
