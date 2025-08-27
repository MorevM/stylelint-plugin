import rule from '../no-unused-variables';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: true,
	accept: [
		{
			description: 'No variables at all',
			code: `
				.the-component {}
			`,
		},
		{
			description: 'Root-level properties are not checked by default',
			code: `
				$foo: bar;
				.the-component {}
			`,
		},
		{
			description: 'Root-level variable used inside block',
			code: `
				$foo: &;

				.the-component {
					#{$foo}__element {}
				}
			`,
		},
		{
			description: 'Variable used in a selector',
			code: `
				.the-component {
					$b: #{&};

					#{$b}__element {}
				}
			`,
		},
		{
			description: 'Variable used in a nested selector',
			code: `
				.the-component {
					&__element {
						$b: #{&};

						#{$b}--active & {}
					}
				}
			`,
		},
		{
			description: 'Multiple variables with the same name',
			code: `
				.the-component {
					$b: #{&};
					$b: #{&};

					@at-root a.#{$b} {}
				}
			`,
		},
		{
			description: 'Variable used in property name',
			code: `
				.the-component {
					$property: width;

					#{$property}: 100px;
				}
			`,
		},
		{
			description: 'Variable used in property value',
			code: `
				.the-component {
					$width: 100px;
					$height: 100;

					&__element {
						width: $width;
						height: calc($height * 2);
					}
				}
			`,
		},
		{
			description: 'Variable used in at-rule parameters',
			code: `
				.the-component {
					$media-value: '(width >= 360px)';

					@media #{$media-value} {
						color: red;
					}
				}
			`,
		},
		{
			description: 'Variable used in at-rule name',
			code: `
				.the-component {
					$at-rule-name: media;

					@#{$at-rule-name} (width >= 360px) {
						color: red;
					}
				}
			`,
		},
		{
			description: 'Variable used as part of another variable definition',
			code: `
				.the-component {
					$width: 100px;

					&__element {
						$height: $width * 2;

						height: $height;
					}
				}
			`,
		},
		{
			description: 'Nested variable used only inside its own scope',
			code: `
				.the-component {
					&__element {
						$b: #{&};

						#{$b}--modifier {}
					}
				}
			`,
		},
		{
			description: 'Overridden variable is used in both scopes',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						$b: #{&};
						#{$b}__inner {}
					}

					#{$b}__outer {}
				}
			`,
		},
		{
			description: 'Top-level variable is mutated within nested rule',
			code: `
				@mixin transition($properties...) {
					$duration: .3s;

					@for $i from 1 through list.length($properties) {
						$prop: list.nth($properties, $i);
						$duration: $prop;
					}

					@include more.use-transition($properties: $properties, $duration: $duration);
				}
			`,
		},
	],
	reject: [
		{
			description: 'Unused variable',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$b'),
					line: 2, column: 2,
					endLine: 2, endColumn: 11,
				},
			],
		},
		{
			description: 'Variable is declared but only appears as literal in value',
			code: `
				.the-component {
					$b: #{&};
					content: \\$b;
					content: "$b";
					content: '$b';
				}
			`,
			warnings: [
				{
					message: messages.unused('$b'),
					line: 2, column: 2,
					endLine: 2, endColumn: 11,
				},
			],
		},
		{
			description: 'Multiple unused variables',
			code: `
				.the-component {
					$b: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$b'),
					line: 2, column: 2,
					endLine: 2, endColumn: 11,
				},
				{
					message: messages.unused('$block'),
					line: 3, column: 2,
					endLine: 3, endColumn: 15,
				},
			],
		},
		{
			description: 'Reports only last occurrence of variable in case of multiple variables with the same name',
			code: `
				.the-component {
					$b: #{&};
					$b: #{&};
					$b: #{&};

					$foo: #{&};
					$foo: #{&};
					$foo: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$b'),
					line: 4, column: 2,
					endLine: 4, endColumn: 11,
				},
				{
					message: messages.unused('$foo'),
					line: 8, column: 2,
					endLine: 8, endColumn: 13,
				},
			],
		},
		{
			description: 'Unused nested re-defined variable',
			code: `
				.the-component {
					$b: #{&};

					&__element {
						$b: #{&};
					}

					&__another-element {
						#{$b} {}
					}
				}
			`,
			warnings: [
				{
					message: messages.unused('$b'),
					line: 5, column: 3,
					endLine: 5, endColumn: 12,
				},
			],
		},
	],
});

testRule({
	description: '`checkRoot` option',
	config: [true, { checkRoot: true }],
	accept: [
		{
			description: 'The root variable is used at the root level',
			code: `
				$foo: '.block';

				#{$foo} {}
			`,
		},
		{
			description: 'The root variable is used inside the rule',
			code: `
				$foo: red;

				.foo {
					color: $foo;
				}
			`,
		},
		{
			description: 'The root variable is used inside @at-rule',
			code: `
				$foo: red;

				@media (screen) {
					.foo {
						color: $foo;
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'The only root property',
			code: `
				$foo: bar;
			`,
			warnings: [
				{
					message: messages.unused('$foo'),
					line: 1, column: 1,
					endLine: 1, endColumn: 11,
				},
			],
		},
		{
			description: 'Unused root and nested properties',
			code: `
				$foo: bar;

				.the-component {
					$b: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$foo'),
					line: 1, column: 1,
					endLine: 1, endColumn: 11,
				},
				{
					message: messages.unused('$b'),
					line: 4, column: 2,
					endLine: 4, endColumn: 11,
				},
			],
		},
	],
});

testRule({
	description: '`ignore` option as a string',
	config: [true, { ignore: ['b'] }],
	accept: [
		{
			description: 'Does not report ignored variable',
			code: `
				.the-component {
					$b: #{&};
				}
			`,
		},
	],
	reject: [
		{
			description: 'Still reports another unused variables',
			code: `
				.the-component {
					$b: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$block'),
					line: 3, column: 2,
					endLine: 3, endColumn: 15,
				},
			],
		},
	],
});

testRule({
	description: '`ignore` option as a string with wildcard',
	config: [true, { ignore: ['-*'] }],
	accept: [
		{
			description: 'Does not report ignored variables by pattern',
			code: `
				.the-component {
					$-foo: #{&};
					$-bar: #{&};
				}
			`,
		},
	],
	reject: [
		{
			description: 'Still reports another unused variables',
			code: `
				.the-component {
					$-foo: #{&};
					$-bar: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$block'),
					line: 4, column: 2,
					endLine: 4, endColumn: 15,
				},
			],
		},
	],
});

testRule({
	description: '`ignore` option as a RegExp',
	config: [true, { ignore: [/.*foo.*/] }],
	accept: [
		{
			description: 'Does not report ignored variables by pattern',
			code: `
				.the-component {
					$foo: #{&};
					$bar-foo: #{&};
					$--foobar: #{&};
				}
			`,
		},
	],
	reject: [
		{
			description: 'Still reports another unused variables',
			code: `
				.the-component {
					$foo: #{&};
					$bar-foo: #{&};
					$--foobar: #{&};
					$block: #{&};
				}
			`,
			warnings: [
				{
					message: messages.unused('$block'),
					line: 5, column: 2,
					endLine: 5, endColumn: 15,
				},
			],
		},
	],
});

// `messages` option
testRule({
	description: 'Custom messages',
	config: [true, {
		messages: {
			unused: (name: string) => `Unused ${name}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				.the-component {
					$b: #{&},
				}
			`,
			warnings: [
				{ message: `Unused $b` },
			],
		},
	],
});
