import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Sass include names',
	config: [true, {
		order: ['sass:include-statements', 'declarations', 'sass:include-blocks'],
		categories: {
			'at-rules': [{ type: 'at-rule', parameter: /^theme\./u }, '*'],
			'sass:includes': ['layout.respond-to', '*'],
			'sass:include-statements': { sort: { by: 'name', direction: 'desc' } },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Orders calls by qualified name within their statement and content-block positions',
		code: `
			.card {
				@include layout.respond-to(20rem);
				@include theme.respond-to(80rem) {}
				color: red;
				@include layout.respond-to(40rem) using ($width) {}
				@include theme.respond-to;
			}
		`,
		fixed: `
			.card {
				@include theme.respond-to;
				@include layout.respond-to(20rem);
				color: red;
				@include layout.respond-to(40rem) using ($width) {}
				@include theme.respond-to(80rem) {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@include theme.respond-to', '@include layout.respond-to(20rem)') },
			{ message: messages.expectedAfter('@include theme.respond-to(80rem)', '@include layout.respond-to(40rem) using ($width)') },
		],
	}],
});

testRule({
	description: 'Separate Sass include forms',
	config: [true, {
		order: ['sass:includes', 'declarations', 'sass:include-blocks'],
		categories: {
			'sass:includes': { sort: { by: 'name', direction: 'asc' } },
			'sass:include-blocks': { sort: { by: 'dimension', direction: 'asc' } },
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Uses the later block category and keeps statements in the shared category',
		code: `
			.card {
				@include layout.from(40rem) {}
				@include reset;
				color: red;
			}
		`,
		fixed: `
			.card {
				@include reset;
				color: red;
				@include layout.from(40rem) {}
			}
		`,
		warnings: [{ message: messages.expectedAfter('@include layout.from(40rem)', 'color') }],
	}, {
		description: 'Sorts statements by qualified name and blocks by breakpoint width',
		code: `
			.card {
				@include theme.reset;
				@include layout.reset;
				@include layout.from(60rem) {}
				@include layout.from(40rem) {}
			}
		`,
		fixed: `
			.card {
				@include layout.reset;
				@include theme.reset;
				@include layout.from(40rem) {}
				@include layout.from(60rem) {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@include layout.reset', '@include theme.reset') },
			{ message: messages.expectedBefore('@include layout.from(40rem)', '@include layout.from(60rem)') },
		],
	}],
});

testRule({
	description: 'Generic at-rule order within Sass includes',
	config: [true, {
		root: { order: ['at-rules', 'rules', 'sass:includes'] },
		categories: { 'at-rules': [{ type: 'at-rule', parameter: 'theme' }, '*'] },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Uses the generic priority for calls while keeping them after selector rules',
		code: `
			@media print {}
			@include reset;
			.card {}
			@include theme;
		`,
		fixed: `
			@media print {}
			.card {}
			@include theme;
			@include reset;
		`,
		warnings: [{ message: messages.expectedAfter('@include reset', '@include theme') }],
	}],
});

testRule({
	description: 'Sass includes in a custom order',
	config: [true, {
		root: { order: ['at-rules', 'sass:include-statements', { type: 'at-rule', name: 'include', parameter: 'reset' }] },
		categories: { 'sass:includes': { sort: { by: 'dimension', direction: 'asc' } } },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Sorts include arguments by dimension and gives an explicit matcher its own position',
		code: `
			@media print {}
			@include layout.from(60rem);
			@include reset;
			@include layout.from(40rem);
		`,
		fixed: `
			@media print {}
			@include layout.from(40rem);
			@include layout.from(60rem);
			@include reset;
		`,
		warnings: [
			{ message: messages.expectedBefore('@include layout.from(40rem)', '@include reset') },
		],
	}],
});
