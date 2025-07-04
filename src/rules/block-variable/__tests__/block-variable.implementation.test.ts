import rule from '../block-variable';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'Ignores CSS files',
			codeFilename: 'the-component.css',
			code: `
				.the-component {}
			`,
		},
		{
			description: 'Variable referencing the block with the proper name and value (interpolated by default)',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
		},
		{
			description: 'Validates only the first element direct children',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						$b: #{&};
					}

					.side-effect-component {
						$b: #{&};
					}
				}

				.another-component {
					$bbb: #{&};
				}
			`,
		},
		{
			description: 'Does not replace non-nested declaration with block variable',
			code: `
				.the-component {
					$b: #{&};
				}

				.the-component__element {}
			`,
		},
	],
	reject: [
		{
			description: 'Lacks a variable referencing the block',
			code: `
				.the-component {}
			`,
			fixed: `
				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					line: 1, column: 1,
					endLine: 1, endColumn: 15,
					message: messages.lack('$b'),
				},
			],
		},
		{
			description: 'Variable referencing the block, but with the wrong name',
			code: `
				.the-component {
					$block: #{&};
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					line: 2, column: 2,
					endLine: 2, endColumn: 15,
					message: messages.wrongName('$b', '$block'),
				},
			],
		},
		{
			description: 'Variable referencing the block, but with the wrong value',
			code: `
				.the-component {
					$b: .the-component;
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					line: 2, column: 2,
					endLine: 2, endColumn: 21,
					message: messages.wrongValue('.the-component', ['#{&}']),
				},
			],
		},
		{
			description: 'Multiple variables referencing the block',
			code: `
				.the-component {
					$b: #{&};
					$bl: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{
					line: 3, column: 2,
					endLine: 3, endColumn: 12,
					message: messages.extra('$bl', '$b'),
				},
				{
					line: 4, column: 2,
					endLine: 4, endColumn: 15,
					message: messages.extra('$block', '$b'),
				},
			],
		},
		{
			description: 'Variable not as the first child',
			code: `
				.the-component {
					color: red;
					$b: #{&};
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};
					color: red;
				}
			`,
			warnings: [
				{
					line: 3, column: 2,
					endLine: 3, endColumn: 11,
					message: messages.first('$b', '.the-component'),
				},
			],
		},
		{
			description: 'Reports replacement',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						.the-component--active.the-component--disabled & {
							color: red;
						}
					}
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};

					&__element {
						#{$b}--active#{$b}--disabled & {
							color: red;
						}
					}
				}
			`,
			warnings: [
				{
					line: 5, column: 3,
					endLine: 5, endColumn: 17,
					message: messages.replacement('.the-component', '#{$b}'),
				},
				{
					line: 5, column: 25,
					endLine: 5, endColumn: 39,
					message: messages.replacement('.the-component', '#{$b}'),
				},
			],
		},
		{
			description: 'Reports replacement with combined selector',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						&--modifier,
						.the-component--active.the-component--disabled & {
							color: red;
						}
					}
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};

					&__element {
						&--modifier,
						#{$b}--active#{$b}--disabled & {
							color: red;
						}
					}
				}
			`,
			warnings: [
				{
					line: 6, column: 3,
					endLine: 6, endColumn: 17,
					message: messages.replacement('.the-component', '#{$b}'),
				},
				{
					line: 6, column: 25,
					endLine: 6, endColumn: 39,
					message: messages.replacement('.the-component', '#{$b}'),
				},
			],
		},
	],
});

// "name" is "block"
testRule({
	description: '"name" is "block"',
	config: [true, { name: 'block' }],
	accept: [
		{
			description: 'The component has a variable referencing the block with the proper name and value',
			code: `
				.the-component {
					$block: #{&};
				}
			`,
		},
	],
	reject: [
		{
			description: 'The component lacks a variable referencing the block',
			code: `
				.the-component {}
			`,
			warnings: [
				{
					line: 1, column: 1,
					endLine: 1, endColumn: 15,
					message: messages.lack('$block'),
				},
			],
		},
		{
			description: 'The component has a variable referencing the block, but with the wrong name',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					line: 2, column: 2,
					endLine: 2, endColumn: 11,
					message: messages.wrongName('$block', '$b'),
				},
			],
		},
		{
			description: 'The component has a multiple variables referencing the block',
			code: `
				.the-component {
					$block: #{&};
					$b: #{&};
				}
			`,
			warnings: [
				{
					line: 3, column: 2,
					endLine: 3, endColumn: 11,
					message: messages.extra('$b', '$block'),
				},
			],
		},
	],
});

// "interpolation" is "ignore"
testRule({
	description: '"interpolation" is "ignore"',
	config: [true, { interpolation: 'ignore' }],
	accept: [
		{
			description: 'Does not report any valid value',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
		},
		{
			description: 'Does not report any valid value #2',
			code: `
				.the-component {
					$b: &;
				}
			`,
		},
	],
});

// "interpolation" is "never"
testRule({
	description: '"interpolation" is "never"',
	config: [true, { interpolation: 'never' }],
	accept: [
		{
			description: 'The component has a variable referencing the block with non-interpolated value',
			code: `
				.the-component {
					$b: &;
				}
			`,
		},
	],
	reject: [
		{
			description: 'The component has a variable referencing the block with interpolated value',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
			fixed: `
				.the-component {
					$b: &;
				}
			`,
			warnings: [
				{
					line: 2, column: 2,
					endLine: 2, endColumn: 11,
					message: messages.wrongValue('#{&}', ['&']),
				},
			],
		},
	],
});

// "firstChild" is "false"
testRule({
	description: '"firstChild" is "false"',
	config: [true, { firstChild: false }],
	accept: [
		{
			description: 'Does not report the variable if it is not the first one',
			code: `
				.the-component {
					color: red;

					&__el {}

					$b: #{&};
				}
			`,
		},
	],
});

// "replaceBlockName" is "false"
testRule({
	description: '"replaceBlockName" is false',
	config: [true, { replaceBlockName: false }],
	accept: [
		{
			description: 'Hardcoded block name inside nested selector is allowed',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						.the-component--active & {
							color: red;
						}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Still reports missing block variable if it is absent',
			code: `
				.the-component {}
			`,
			warnings: [
				{
					line: 1, column: 1,
					endLine: 1, endColumn: 15,
					message: rule.messages.lack('$b'),
				},
			],
		},
	],
});
