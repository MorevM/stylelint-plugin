import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName });

testRule({
	description: 'Default stylesheet query order',
	config: [true],
	reject: [{
		description: 'Groups media queries before container queries and preserves the order of media conditions',
		code: `
			@media print {}
			@container (width > 30rem) {}
			@media (hover: hover) {}
		`,
		fixed: `
			@media print {}
			@media (hover: hover) {}
			@container (width > 30rem) {}
		`,
		warnings: [{ message: messages.expectedBefore('@media (hover: hover)', '@container (width > 30rem)') }],
	}],
});

testRule({
	description: 'CSS queries at the stylesheet level',
	config: [true, {
		root: {
			order: ['at-rules', 'rules', 'css:media', 'css:container', { type: 'at-rule', name: 'media', parameter: 'print' }],
		},
		within: {
			'css:media': ['(  --phone )', /\(--phone\)/u, '*'],
			'css:container': ['sidebar ( width > 30rem )', /^sidebar /u, '*'],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Selects query categories before generic at-rules and lets an explicit matcher claim print',
		code: `
			@media print {}
			@supports (display: grid) {}
			.card {}
			@MEDIA screen {}
			@CONTAINER (width > 30rem) {}
		`,
		fixed: `
			@supports (display: grid) {}
			.card {}
			@MEDIA screen {}
			@CONTAINER (width > 30rem) {}
			@media print {}
		`,
		warnings: [{ message: messages.expectedAfter('@media print', '@CONTAINER (width > 30rem)') }],
	}, {
		description: 'Matches an exact media condition before a pattern that also matches compound queries',
		code: `
			@media (color) {}
			@media screen and ( --phone ) {}
			@media (--phone) {}
		`,
		fixed: `
			@media (--phone) {}
			@media screen and ( --phone ) {}
			@media (color) {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (--phone)', '@media (color)') },
			{ message: messages.expectedBefore('@media screen and ( --phone )', '@media (color)') },
		],
	}, {
		description: 'Includes the container name in exact and pattern matches',
		code: `
			@container (width > 30rem) {}
			@container sidebar style(--dense: true) {}
			@container sidebar (width   > 30rem) {}
		`,
		fixed: `
			@container sidebar (width   > 30rem) {}
			@container sidebar style(--dense: true) {}
			@container (width > 30rem) {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@container sidebar (width   > 30rem)', '@container (width > 30rem)') },
			{ message: messages.expectedBefore('@container sidebar style(--dense: true)', '@container (width > 30rem)') },
		],
	}],
});

testRule({
	description: 'Query sorting with the default nested order',
	config: [true, {
		within: {
			'css:container': { sort: { by: 'dimension' } },
			'at-rules': [{ type: 'at-rule', name: 'media', parameter: 'print' }, '*'],
		},
	} satisfies SecondaryOption],
	reject: [{
		description: 'Orders media first, then sorts container queries by width',
		code: `
			.card {
				@media screen {}
				@container sidebar (min-width: 50rem) {}
				@media print {}
				@container sidebar (min-width: 30rem) {}
			}
		`,
		fixed: `
			.card {
				@media print {}
				@media screen {}
				@container sidebar (min-width: 30rem) {}
				@container sidebar (min-width: 50rem) {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media print', '@media screen') },
			{ message: messages.expectedBefore('@container sidebar (min-width: 30rem)', '@container sidebar (min-width: 50rem)') },
		],
	}],
});
