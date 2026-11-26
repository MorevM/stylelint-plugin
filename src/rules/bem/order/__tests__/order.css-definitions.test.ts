import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName });

testRule({
	description: 'CSS function and mixin definitions',
	config: [true, {
		root: { order: ['at-rules', 'css:mixins', 'css:functions'] },
		categories: {
			'css:mixins': { sort: { by: 'name' } },
			'css:functions': ['--space', '*'],
		},
	} satisfies SecondaryOption],
	accept: [{
		description: 'Keeps a nested CSS function between the declarations on either side',
		code: `
			.card {
				color: red;
				@FUNCTION --tone() { result: red; }
				--gap: 1rem;
			}
		`,
	}],
	reject: [{
		description: 'Moves a CSS function after generic at-rules and CSS mixins',
		code: `
			@FUNCTION --brand() { result: red; }
			@media print {}
			@mixin --theme {}
		`,
		fixed: `
			@media print {}
			@mixin --theme {}
			@FUNCTION --brand() { result: red; }
		`,
		warnings: [{ message: messages.expectedAfter('@FUNCTION --brand()', '@mixin --theme') }],
	}, {
		description: 'Sorts mixins by name and selects a CSS function by its full dashed name',
		code: `
			@mixin --wide {}
			@MIXIN --compact(--gap) {}
			@function --tone() { result: red; }
			@function --space(--size) { result: var(--size); }
		`,
		fixed: `
			@MIXIN --compact(--gap) {}
			@mixin --wide {}
			@function --space(--size) { result: var(--size); }
			@function --tone() { result: red; }
		`,
		warnings: [
			{ message: messages.expectedBefore('@MIXIN --compact(--gap)', '@mixin --wide') },
			{ message: messages.expectedBefore('@function --space(--size)', '@function --tone()') },
		],
	}],
});
