import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Sass definition names',
	config: [true, {
		root: { order: ['at-rules', 'sass:functions', 'sass:mixins'] },
		categories: {
			'sass:functions': ['tone', '*'],
			'sass:mixins': { order: [/^[-_]/u, 'respond-to', '*'], sort: { by: 'name' } },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Moves an escaped respond-to mixin ahead of compact and preserves its signature',
		code: String.raw`
			@mixin _layout {}
			@mixin compact {}
			@mixin respond\2d to/* viewport */($width) {}
		`,
		fixed: String.raw`
			@mixin _layout {}
			@mixin respond\2d to/* viewport */($width) {}
			@mixin compact {}
		`,
		warnings: [{
			message: messages.expectedBefore(String.raw`@mixin respond\2d to/* viewport */($width)`, '@mixin compact'),
		}],
	}, {
		description: 'Orders private and named mixins before alphabetically sorted public mixins',
		code: `
			@mixin wide {}
			@mixin respond-to($width) {}
			@mixin _layout {}
			@mixin compact($gap) {}
			@mixin -base($size) {}
		`,
		fixed: `
			@mixin -base($size) {}
			@mixin _layout {}
			@mixin respond-to($width) {}
			@mixin compact($gap) {}
			@mixin wide {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@mixin -base($size)', '@mixin respond-to($width)') },
			{ message: messages.expectedBefore('@mixin _layout', '@mixin respond-to($width)') },
			{ message: messages.expectedAfter('@mixin wide', '@mixin compact($gap)') },
		],
	}, {
		description: 'Matches the declared function name and keeps CSS functions and mixin calls in at-rules',
		code: `
			@function scale($tone) { @return $tone; }
			@function --tone() { result: red; }
			@include theme;
			@function tone() { @return red; }
		`,
		fixed: `
			@function --tone() { result: red; }
			@include theme;
			@function tone() { @return red; }
			@function scale($tone) { @return $tone; }
		`,
		warnings: [{ message: messages.expectedAfter('@function scale($tone)', '@function tone()') }],
	}],
});

testRule({
	description: 'Generic at-rule sorting for Sass definitions',
	config: [true, {
		root: { order: ['at-rules'] },
		categories: { 'at-rules': { sort: { by: 'name' } } },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Exposes directive names when the order uses the generic at-rule category',
		code: `
			@mixin compact {}
			@function tone() { @return red; }
		`,
		fixed: `
			@function tone() { @return red; }
			@mixin compact {}
		`,
		warnings: [{ message: messages.expectedBefore('@function tone()', '@mixin compact') }],
	}],
});
