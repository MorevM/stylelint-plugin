import rule from '../block-variable';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

// Default options
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
		{
			description: 'Does not replace nested declaration with block variable if declaration is not a state of component',
			code: `
				.the-component {
					$b: #{&};

					.the-component-foo {}
				}
			`,
		},
		{
			description: 'Accepts the block reference variable and raw nesting selector',
			code: `
				.block {
					$b: #{&};
					@at-root #{$b}__title { color: red; }
					@at-root &__title { color: red; }
				}
			`,
		},
		{
			description: 'Preserves block scoping',
			code: `
				.block {
					$b: #{&};
					@at-root .block-other__title {}
				}
				@at-root .block__title {}
				.other { @at-root .block__title {} }
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
					message: messages.missingVariable('$b'),
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
					message: messages.invalidVariableName('$b', '$block'),
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
					message: messages.invalidVariableValue('.the-component', ['#{&}']),
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
					message: messages.duplicatedVariable('$bl', '$b'),
				},
				{
					line: 4, column: 2,
					endLine: 4, endColumn: 15,
					message: messages.duplicatedVariable('$block', '$b'),
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
					message: messages.variableNotFirst('$b', '.the-component'),
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
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'nested', true),
				},
				{
					line: 5, column: 25,
					endLine: 5, endColumn: 39,
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'nested', true),
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
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'nested', true),
				},
				{
					line: 6, column: 25,
					endLine: 6, endColumn: 39,
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'nested', true),
				},
			],
		},
		{
			description: 'Just reports without auto-fix at the root level if the parent selector is not used in the selector',
			code: `
				.the-component {
					$b: #{&};

					.the-component__bar {}
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};

					.the-component__bar {}
				}
			`,
			warnings: [
				{
					line: 4, column: 2,
					endLine: 4, endColumn: 16,
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'root', false),
				},
			],
		},
		{
			description: 'Autofix with `&` at the root level if parent selector is used within a selector',
			code: `
				.the-component {
					$b: #{&};

					& .the-component__bar {}
				}
			`,
			fixed: `
				.the-component {
					$b: #{&};

					& &__bar {}
				}
			`,
			warnings: [
				{
					line: 4, column: 4,
					endLine: 4, endColumn: 18,
					message: messages.hardcodedBlockName('.the-component', '#{$b}', 'root', true),
				},
			],
		},
		{
			description: 'Reports and fixes a hardcoded block in an explicit `@at-root` selector',
			code: `
				.block {
					$b: #{&};
					@at-root .block__title { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@at-root #{$b}__title { color: red; }
				}
			`,
			warnings: [{
				line: 3, column: 11,
				endLine: 3, endColumn: 17,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Keeps reporting the equivalent block form',
			code: `
				.block {
					$b: #{&};
					@at-root {
						.block__title { color: red; }
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@at-root {
						#{$b}__title { color: red; }
					}
				}
			`,
			warnings: [{
				line: 4, column: 3,
				endLine: 4, endColumn: 9,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Preserves attribute strings and unrelated classes in the equivalent block form',
			code: `
				.block {
					$b: #{&};
					@at-root {
						.block__title[data-label=".block__title"].block-other { color: red; }
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@at-root {
						#{$b}__title[data-label=".block__title"].block-other { color: red; }
					}
				}
			`,
			warnings: [{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) }],
		},
		{
			description: 'Uses the block variable inside a nested entity',
			code: `
				.block {
					$b: #{&};
					&__item {
						@at-root .block__title & { color: red; }
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					&__item {
						@at-root #{$b}__title & { color: red; }
					}
				}
			`,
			warnings: [{
				line: 4, column: 12,
				endLine: 4, endColumn: 18,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Preserves spacing, comments, unrelated classes, and attribute strings when fixing a selector list',
			code: `
				.block {
					$b: #{&};
					@at-root /* comment */   .block__title[data-label=".block__title"],
						.block--active.block-other { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@at-root /* comment */   #{$b}__title[data-label=".block__title"],
						#{$b}--active.block-other { color: red; }
				}
			`,
			warnings: [
				{
					line: 3, column: 27,
					endLine: 3, endColumn: 33,
					message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
				},
				{
					line: 4, column: 3,
					endLine: 4, endColumn: 9,
					message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
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
					message: messages.missingVariable('$block'),
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
					message: messages.invalidVariableName('$block', '$b'),
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
					message: messages.duplicatedVariable('$b', '$block'),
				},
			],
		},
		{
			description: 'Uses the configured variable name',
			code: `
				.block {
					$block: #{&};
					@at-root .block__title {}
				}
			`,
			fixed: `
				.block {
					$block: #{&};
					@at-root #{$block}__title {}
				}
			`,
			warnings: [{ message: messages.hardcodedBlockName('.block', '#{$block}', 'nested', true) }],
		},
		{
			description: 'Uses the configured variable name in selector queries',
			code: `
				.block {
					$block: #{&};
					@supports selector(.block__title) {}
					@scope (.block__title) {}
				}
			`,
			fixed: `
				.block {
					$block: #{&};
					@supports selector(#{$block}__title) {}
					@scope (#{$block}__title) {}
				}
			`,
			warnings: [
				{ message: messages.hardcodedBlockName('.block', '#{$block}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$block}', 'nested', true) },
			],
		},
		{
			description: 'Uses the configured variable name in extension targets',
			code: `
				.block {
					$block: #{&};
					&__title { @extend .block__base !optional; }
				}
			`,
			fixed: `
				.block {
					$block: #{&};
					&__title { @extend #{$block}__base !optional; }
				}
			`,
			warnings: [{ message: messages.hardcodedBlockName('.block', '#{$block}', 'nested', true) }],
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
					message: messages.invalidVariableValue('#{&}', ['&']),
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
		{
			description: 'Allows hardcoded block names in selector owners and queries',
			code: `
				.block {
					$b: #{&};
					@at-root .block__title { color: red; }
					@at-root { .block__title { color: red; } }
					@supports selector(.block__title) {}
					@scope (.block__title) {}
					&__title { @extend .block__base !optional; }
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
					message: rule.messages.missingVariable('$b'),
				},
			],
		},
	],
});

// Custom messages > `missingVariable`
testRule({
	description: 'Custom messages > `missingVariable`',
	config: [true, {
		messages: {
			missingVariable: (validName: string) => `Missing ${validName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {}
			`,
			warnings: [
				{ message: `Missing $b (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `missingVariable`
testRule({
	description: 'Custom messages > `missingVariable`',
	config: [true, {
		messages: {
			missingVariable: (validName: string) => `Missing ${validName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {}
			`,
			warnings: [
				{ message: `Missing $b (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `variableNotFirst`
testRule({
	description: 'Custom messages > `variableNotFirst`',
	config: [true, {
		messages: {
			variableNotFirst: (validValue: string, selector: string) => `Not first ${validValue} ${selector}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					color: red;
					$b: #{&};
				}
			`,
			warnings: [
				{ message: `Not first $b .the-component (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `invalidVariableName`
testRule({
	description: 'Custom messages > `invalidVariableName`',
	config: [true, {
		messages: {
			invalidVariableName: (validName: string, actualName: string) => `Invalid name ${validName} ${actualName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					$block: #{&};
				}
			`,
			warnings: [
				{ message: `Invalid name $b $block (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `invalidVariableValue`
testRule({
	description: 'Custom messages > `invalidVariableValue`',
	config: [true, {
		messages: {
			invalidVariableValue: (actualValue: string, availableValues: string[]) =>
				`Invalid value ${actualValue} ${availableValues.join('|')}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					$b: .the-component;
				}
			`,
			warnings: [
				{ message: `Invalid value .the-component #{&} (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `duplicatedVariable`
testRule({
	description: 'Custom messages > `duplicatedVariable`',
	config: [true, {
		messages: {
			duplicatedVariable: (foundName: string, validName: string) =>
				`Duplicated ${foundName} ${validName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					$b: #{&};
					$bl: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{ message: `Duplicated $bl $b (@morev/bem/block-variable)` },
				{ message: `Duplicated $block $b (@morev/bem/block-variable)` },
			],
		},
	],
});

// Custom messages > `hardcodedBlockName`
testRule({
	description: 'Custom messages > `hardcodedBlockName`',
	config: [true, {
		messages: {
			hardcodedBlockName: (blockSelector: string, variableName: string, context: string, fixable: boolean) =>
				`Hardcoded ${blockSelector} ${variableName} ${context} ${fixable.toString()}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					$b: #{&};

					&__foo {
						.the-component--active & {}
					}

					& .the-component__bar {}
					.the-component__bar {}
				}
			`,
			warnings: [
				{ message: `Hardcoded .the-component #{$b} nested true (@morev/bem/block-variable)` },
				{ message: `Hardcoded .the-component #{$b} root true (@morev/bem/block-variable)` },
				{ message: `Hardcoded .the-component #{$b} root false (@morev/bem/block-variable)` },
			],
		},
	],
});


testRule({
	description: 'Extension targets',
	config: [true],
	accept: [
		{
			description: 'Accepts block variables, placeholders, and targets from other blocks',
			code: `
				.block {
					$b: #{&};
					&__title {
						@extend #{$b}__base !optional;
						@extend %block__base !optional;
						@extend .block-other__base !optional;
					}
				}
			`,
		},
		{
			description: 'Preserves the component variable scope for extension targets',
			code: `
				.block { $b: #{&}; }
				.other { @extend .block__base !optional; }
			`,
		},
	],
	reject: [
		{
			description: 'Reports and fixes an extension target inside a nested entity',
			code: `
				.block {
					$b: #{&};
					&__base { color: red; }
					&__title {
						@extend .block__base;
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					&__base { color: red; }
					&__title {
						@extend #{$b}__base;
					}
				}
			`,
			warnings: [{
				line: 5, column: 11,
				endLine: 5, endColumn: 17,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Preserves optional flag casing and comments when fixing a target list',
			code: `
				.block {
					$b: #{&};
					&__title {
						@extend /* comment */ .block__base, .block__label !OPTIONAL /* keep */;
						color: red;
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					&__title {
						@extend /* comment */ #{$b}__base, #{$b}__label !OPTIONAL /* keep */;
						color: red;
					}
				}
			`,
			warnings: [
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
			],
		},
		{
			description: 'Uses the block variable for direct extension targets',
			code: `
				.block {
					$b: #{&};
					@extend .block__base !optional;
					color: red;
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@extend #{$b}__base !optional;
					color: red;
				}
			`,
			warnings: [{
				line: 3, column: 10,
				endLine: 3, endColumn: 16,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
	],
});

testRule({
	description: 'Selector queries and scope boundaries',
	config: [true],
	accept: [
		{
			description: 'Accepts block variables in selector tests and both scope boundaries',
			code: `
				.block {
					$b: #{&};
					@supports selector(#{$b}__title) {}
					@scope (#{$b}__title) to (#{$b}__content) {}
					@scope {}
				}
			`,
		},
		{
			description: 'Ignores declaration queries, opaque functions, and unrelated at-rules',
			code: `
				.block {
					$b: #{&};
					@supports (font-family: ".block__title") {}
					@supports (--custom: selector(.block__title)) {}
					@supports unknown(selector(.block__title)) {}
					@media (--custom: selector(.block__title)) {}
					--selector: ".block__title";
				}
			`,
		},
		{
			description: 'Ignores attribute strings, comments, and other blocks in selector arguments',
			code: `
				.block {
					$b: #{&};
					@supports selector([data-label=".block__title"]) {}
					@supports selector(.block-other__title /* .block__title */) {}
					@scope ([data-label=".block__title"]) to (.other__title) {}
				}
			`,
		},
		{
			description: 'Preserves the component variable scope for selector queries',
			code: `
				.block { $b: #{&}; }
				@supports selector(.block__title) {}
				.other { @scope (.block__title) {} }
			`,
		},
	],
	reject: [
		{
			description: 'Reports and fixes a selector support test',
			code: `
				.block {
					$b: #{&};
					@supports selector(.block__title) { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@supports selector(#{$b}__title) { color: red; }
				}
			`,
			warnings: [{
				line: 3, column: 21,
				endLine: 3, endColumn: 27,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Checks selector functions inside nested boolean support conditions',
			code: `
				.block {
					$b: #{&};
					@supports not (selector(.block__title) or selector(.block--active)) { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@supports not (selector(#{$b}__title) or selector(#{$b}--active)) { color: red; }
				}
			`,
			warnings: [
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
			],
		},
		{
			description: 'Checks nested selector pseudos without replacing attribute strings or declaration values',
			code: `
				.block {
					$b: #{&};
					@supports selector(:is(.block__title, .other):has(.block__label[data-ref=".block__label"]))
						and (--custom: selector(.block__title)) { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@supports selector(:is(#{$b}__title, .other):has(#{$b}__label[data-ref=".block__label"]))
						and (--custom: selector(.block__title)) { color: red; }
				}
			`,
			warnings: [
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
			],
		},
		{
			description: 'Preserves comments and reports the actual position in a multiline header',
			code: `
				.block {
					$b: #{&};
					@supports /* comment */
						selector(.block__title) { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@supports /* comment */
						selector(#{$b}__title) { color: red; }
				}
			`,
			warnings: [{
				line: 4, column: 12,
				endLine: 4, endColumn: 18,
				message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true),
			}],
		},
		{
			description: 'Checks both scope boundaries, including selector lists',
			code: `
				.block {
					$b: #{&};
					@scope (.block__title, .other) to (:is(.block__body, .block__footer)) { color: red; }
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					@scope (#{$b}__title, .other) to (:is(#{$b}__body, #{$b}__footer)) { color: red; }
				}
			`,
			warnings: [
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
				{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) },
			],
		},
		{
			description: 'Checks uppercase selector functions inside nested entities',
			code: `
				.block {
					$b: #{&};
					&__item {
						@supports SELECTOR(.block__title) { color: red; }
					}
				}
			`,
			fixed: `
				.block {
					$b: #{&};
					&__item {
						@supports SELECTOR(#{$b}__title) { color: red; }
					}
				}
			`,
			warnings: [{ message: messages.hardcodedBlockName('.block', '#{$b}', 'nested', true) }],
		},
	],
});
