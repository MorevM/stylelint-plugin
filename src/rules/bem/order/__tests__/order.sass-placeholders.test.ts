import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Sass placeholder selectors',
	config: [true],
	accept: [{
		description: 'Keeps escaped percent signs and pseudo-class arguments among ordinary selectors',
		code: `
			button {}
			.control\\%shared {}
			:not(%reset) {}
		`,
	}],
	reject: [{
		description: 'Raises a placeholder list and preserves mixed lists in either branch order',
		code: `
			%reset, button {}
			button, %reset {}
			%reset:hover, .control%shared {}
		`,
		fixed: `
			%reset:hover, .control%shared {}
			%reset, button {}
			button, %reset {}
		`,
		warnings: [{ message: messages.expectedBefore('%reset:hover, .control%shared', '%reset, button') }],
	}],
});

testRule({
	description: 'Custom Sass placeholder order',
	config: [true, {
		order: ['rules', 'sass:placeholders'],
		categories: { 'sass:placeholders': ['%reset', '*'] },
	}],
	reject: [{
		description: 'Orders nested placeholders after ordinary rules and applies their local priorities',
		code: `
			.card {
				button::placeholder {}
				%shared {}
				%reset {}
				[data-label="%reset"] {}
			}
		`,
		fixed: `
			.card {
				button::placeholder {}
				[data-label="%reset"] {}
				%reset {}
				%shared {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('[data-label="%reset"]', '%shared') },
			{ message: messages.expectedBefore('%reset', '%shared') },
		],
	}],
});
