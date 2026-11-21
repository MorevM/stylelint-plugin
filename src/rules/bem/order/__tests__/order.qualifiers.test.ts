import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Shared BEM qualifier category',
	config: [true, {
		order: ['base', 'qualifiers', 'pseudo-classes'],
		unspecified: 'ignore',
	}],
	reject: [{
		description: 'Keeps class, attribute, type and ID qualifiers ahead of pseudo-classes',
		code: `
			.button {}
			.button:not([disabled]) {}
			.button.is-loading {}
			.button[aria-busy] {}
			a.button {}
			.button#checkout {}
		`,
		fixed: `
			.button {}
			.button.is-loading {}
			.button[aria-busy] {}
			a.button {}
			.button#checkout {}
			.button:not([disabled]) {}
		`,
		warnings: [{ message: messages.expectedAfter('.button:not([disabled])', '.button#checkout') }],
	}],
});

testRule({
	description: 'Inherited qualifier order',
	config: [true, {
		order: ['base', 'qualifiers', 'qualifiers:type'],
		categories: {
			'qualifiers': {
				order: ['button', 'a', '#checkout', '.is-loading'],
				blankLines: { before: 'always' },
			},
			'qualifiers:type': { blankLines: { before: 'never' } },
		},
		selectorList: { order: 'inherit' },
	}],
	reject: [{
		description: 'Inherits token order for type selectors and for branches in the shared category',
		code: `
			.button {}

			.button.is-loading, .button#checkout {}
			a.button {}
			button.button {}
		`,
		fixed: `
			.button {}

			.button#checkout, .button.is-loading {}
			button.button {}
			a.button {}
		`,
		warnings: [
			{ message: messages.selectorList('.button#checkout, .button.is-loading') },
			{ message: messages.expectedBefore('button.button', 'a.button') },
		],
	}],
});

testRule({
	description: 'Specific BEM qualifier categories',
	config: [true, {
		order: ['base', 'qualifiers', 'qualifiers:attribute', 'pseudo-classes', 'qualifiers:type', 'qualifiers:class'],
	}],
	reject: [{
		description: 'Uses the first listed matching subtype even when the shared category comes first',
		code: `
			.button {} // base
			.button#checkout {} // qualifiers (ID)
			.button:focus {} // pseudo-classes
			a.button {} // qualifiers:type
			.button.is-loading {} // qualifiers:class
			button.button.is-loading[aria-busy] {} // 📌 qualifiers:attribute comes before type and class.
		`,
		fixed: `
			.button {} // base
			.button#checkout {} // qualifiers (ID)
			button.button.is-loading[aria-busy] {} // 📌 qualifiers:attribute comes before type and class.
			.button:focus {} // pseudo-classes
			a.button {} // qualifiers:type
			.button.is-loading {} // qualifiers:class
		`,
		warnings: [{ message: messages.expectedBefore('button.button.is-loading[aria-busy]', '.button:focus') }],
	}, {
		description: 'Orders qualifiers on an interpolated Sass block reference',
		code: `
			.button {
				$b: #{&};
				@at-root {
					#{$b}.is-loading {} // .button.is-loading matches qualifiers:class.
					a#{$b} {} // a.button matches qualifiers:type.
					button#{$b}.is-loading[aria-busy] {} // qualifiers:attribute wins over type and class.
				}
			}
		`,
		fixed: `
			.button {
				$b: #{&};
				@at-root {
					button#{$b}.is-loading[aria-busy] {} // qualifiers:attribute wins over type and class.
					a#{$b} {} // a.button matches qualifiers:type.
					#{$b}.is-loading {} // .button.is-loading matches qualifiers:class.
				}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('button#{$b}.is-loading[aria-busy]', '#{$b}.is-loading') },
			{ message: messages.expectedBefore('a#{$b}', '#{$b}.is-loading') },
		],
	}, {
		description: 'Orders inline @at-root qualifiers and the nested selectors inside each directive',
		code: `
			.button {
				$b: #{&};
				@at-root #{$b}.is-loading {} // .button.is-loading (qualifiers:class)
				@at-root a#{$b} { // & is a.button here.
					&[aria-busy] {} // qualifiers:attribute wins over the type.
					&#checkout {}   // qualifiers:type comes from the a in a.button#checkout.
					&:focus {}      // pseudo-classes comes before qualifiers:type.
				}
				@at-root #{$b} { // & is .button here.
					& {}            // base
					&.is-loading {} // qualifiers:class
					&#checkout {}   // qualifiers (ID only)
				}
			}
		`,
		fixed: `
			.button {
				$b: #{&};
				@at-root a#{$b} { // & is a.button here.
					&[aria-busy] {} // qualifiers:attribute wins over the type.
					&:focus {}      // pseudo-classes comes before qualifiers:type.
					&#checkout {}   // qualifiers:type comes from the a in a.button#checkout.
				}
				@at-root #{$b}.is-loading {} // .button.is-loading (qualifiers:class)
				@at-root #{$b} { // & is .button here.
					& {}            // base
					&#checkout {}   // qualifiers (ID only)
					&.is-loading {} // qualifiers:class
				}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('&:focus', '&#checkout') },
			{ message: messages.expectedBefore('@at-root a#{$b}', '@at-root #{$b}.is-loading') },
			{ message: messages.expectedBefore('&#checkout', '&.is-loading') },
		],
	}],
});

testRule({
	description: 'Inline @at-root directives between pseudo-classes',
	config: [true, {
		order: ['sass:variables', 'qualifiers:type', 'pseudo-classes', 'qualifiers:class', 'at-rules'],
		categories: { 'pseudo-classes': [':hover', ':focus'] },
	}],
	accept: [{
		description: 'Keeps the class and type qualifiers on their own sides of a bare @at-root',
		code: `
			.button {
				$b: #{&};
				@at-root #{$b}.is-loading {}
				@at-root { .notice {} }
				@at-root a#{$b} {}
			}
		`,
	}, {
		description: 'Preserves the value of a Sass variable read by hoisted qualifiers',
		code: `
			.button {
				$b: #{&};
				$tone: red;
				@at-root #{$b}.is-loading { color: $tone; }
				$tone: blue;
				@at-root a#{$b} { color: $tone; }
			}
		`,
	}],
	reject: [{
		description: 'Moves the inline type qualifier before the pseudo-classes and the class qualifier after them',
		code: `
			.button {
				$b: #{&};
				@at-root #{$b}.is-loading {} // qualifiers:class
				&:focus {}
				@at-root a#{$b} {} // qualifiers:type
				&:hover {}
			}
		`,
		fixed: `
			.button {
				$b: #{&};
				@at-root a#{$b} {} // qualifiers:type
				&:hover {}
				&:focus {}
				@at-root #{$b}.is-loading {} // qualifiers:class
			}
		`,
		warnings: [
			{ message: messages.expectedAfter('&:focus', '&:hover') },
			{ message: messages.expectedAfter('@at-root #{$b}.is-loading', '&:hover') },
		],
	}],
});
