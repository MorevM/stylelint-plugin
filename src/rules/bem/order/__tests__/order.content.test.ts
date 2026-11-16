import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Content insertion boundaries',
	config: [true],
	reject: [{
		description: 'Protects content points and their wrappers while sorting independent regions and whole definitions',
		code: `
			.card {}
			.button {}

			// 📌 Definitions move as whole units.
			@mixin theme {
				color: red;

				// 📌 Declarations stay on their original sides of content insertion.
				@content;

				color: green;

				// 📌 Wrappers containing content insertion stay in place too.
				@supports (display: grid) {
					color: yellow;

					// 📌 Independent regions inside a protected wrapper still sort.
					@media screen {
						.card:active {}
						.card:hover {}

						@content;
					}

					color: orange;
				}

				color: blue;
			}

			// 📌 Native CSS content insertion also keeps declarations on their original sides.
			@mixin --theme {
				color: red;

				@contents;

				color: blue;
			}
		`,
		fixed: `
			// 📌 Definitions move as whole units.
			@mixin theme {
				color: red;

				// 📌 Declarations stay on their original sides of content insertion.
				@content;

				color: green;

				// 📌 Wrappers containing content insertion stay in place too.
				@supports (display: grid) {
					color: yellow;

					// 📌 Independent regions inside a protected wrapper still sort.
					@media screen {
						.card:hover {}
						.card:active {}

						@content;
					}

					color: orange;
				}

				color: blue;
			}

			// 📌 Native CSS content insertion also keeps declarations on their original sides.
			@mixin --theme {
				color: red;

				@contents;

				color: blue;
			}

			.card {}
			.button {}
		`,
		warnings: [
			{ message: messages.expected('.card:hover', '.card:active') },
			{ message: messages.expectedGroup('at-rules "@mixin theme", "@mixin --theme"', '.card') },
		],
	}],
});

for (const directive of ['@content', '@contents']) {
	testRule({
		description: `Quoted ${directive} text`,
		config: [true, { order: ['declarations', 'at-rules', 'rules'] }],
		reject: [{
			description: 'Sorts quoted text as an ordinary declaration and keeps its wrapper movable',
			code: `
				.card {
					@supports (display: grid) {
						&:hover {}

						// 📌 Quoted directive text does not create an insertion boundary.
						content: "${directive}";
					}

					// 📌 A wrapper containing quoted text can still be crossed.
					display: grid;
				}
			`,
			fixed: `
				.card {
					// 📌 A wrapper containing quoted text can still be crossed.
					display: grid;

					@supports (display: grid) {
						// 📌 Quoted directive text does not create an insertion boundary.
						content: "${directive}";

						&:hover {}
					}
				}
			`,
			warnings: [
				{ message: messages.expected('content', '&:hover') },
				{ message: messages.expected('display', '@supports (display:grid)') },
			],
		}],
	});
}
