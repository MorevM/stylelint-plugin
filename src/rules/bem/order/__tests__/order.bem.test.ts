import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Flat BEM families',
	config: [true],
	accept: [{
		description: 'Preserves the authored order of blocks and elements without alphabetizing their names',
		code: `
			.panel {} // 📌 This block appeared before button.
			.panel__title {} // 📌 This element appeared before icon.
			.panel__icon {}
			.button {}
		`,
	}, {
		description: 'Accepts element families consisting only of states without declaring any base rules',
		code: `
			.card__title:hover {}
			.card__title:focus {}
			.card__icon--muted:hover {} // 📌 Neither the block nor this element needs a base rule.
		`,
	}],
	reject: [{
		description: 'Collects each block with its states in first-appearance order',
		code: `
			.panel:hover {} // 📌 The panel family appears first, regardless of its name.
			.button:hover {}
			.panel {}
			.button {}
		`,
		fixed: `
			.panel {}
			.panel:hover {} // 📌 The panel family appears first, regardless of its name.
			.button {}
			.button:hover {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.panel', '.panel:hover') },
			{ message: messages.expectedBefore('.button', '.button:hover') },
		],
	}, {
		description: 'Collects each element with its own states before starting the next element family',
		code: `
			.card {}
			.card__title:hover {} // 📌 Title stays ahead of icon because it appeared first.
			.card__icon:hover {}
			.card__title {}
			.card__icon {}
		`,
		fixed: `
			.card {}
			.card__title {}
			.card__title:hover {} // 📌 Title stays ahead of icon because it appeared first.
			.card__icon {}
			.card__icon:hover {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.card__title', '.card__title:hover') },
			{ message: messages.expectedBefore('.card__icon', '.card__icon:hover') },
		],
	}, {
		description: 'Keeps a boolean block modifier with its states before the next modifier',
		code: `
			.button {}
			.button--compact:hover {}
			.button--disabled {}
			.button--compact {} // 📌 The modifier base precedes its own hover state.
		`,
		fixed: `
			.button {}
			.button--compact {} // 📌 The modifier base precedes its own hover state.
			.button--compact:hover {}
			.button--disabled {}
		`,
		warnings: [{ message: messages.expectedBefore('.button--compact', '.button--compact:hover') }],
	}, {
		description: 'Keeps an element modifier inside its element family',
		code: `
			.card {}
			.card__title--muted:hover {}
			.card__icon {}
			.card__title--muted {}
			.card__title {} // 📌 Title includes its modifier and state before icon starts.
		`,
		fixed: `
			.card {}
			.card__title {} // 📌 Title includes its modifier and state before icon starts.
			.card__title--muted {}
			.card__title--muted:hover {}
			.card__icon {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.card__title', '.card__title--muted:hover') },
			{ message: messages.expectedBefore('.card__title--muted', '.card__title--muted:hover') },
		],
	}, {
		description: 'Collects modifier values and their states under the same modifier name',
		code: `
			.button--size--small:hover {} // 📌 Size and its small value appear first.
			.button--theme--dark {}
			.button--size--large {}
			.button--size--small {}
			.button {}
		`,
		fixed: `
			.button {}
			.button--size--small {}
			.button--size--small:hover {} // 📌 Size and its small value appear first.
			.button--size--large {}
			.button--theme--dark {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.button', '.button--size--small:hover') },
			{ message: messages.expectedBefore('.button--size--small', '.button--size--small:hover') },
			{ message: messages.expectedBefore('.button--size--large', '.button--theme--dark') },
		],
	}, {
		description: 'Collects element states without requiring block or element base rules',
		code: `
			.card__title:active {}
			.card__icon:hover {}
			.card__title:hover {} // 📌 This belongs to title even without a title base rule.
		`,
		fixed: `
			.card__title:hover {} // 📌 This belongs to title even without a title base rule.
			.card__title:active {}
			.card__icon:hover {}
		`,
		warnings: [{ message: messages.expectedBefore('.card__title:hover', '.card__title:active') }],
	}, {
		description: 'Keeps pseudo-element states with the pseudo-element instead of the block states',
		code: `
			.card:hover::before {} // 📌 This hover belongs to the before family.
			.card:hover {}
			.card::before {}
			.card {}
		`,
		fixed: `
			.card {}
			.card:hover {}
			.card::before {}
			.card:hover::before {} // 📌 This hover belongs to the before family.
		`,
		warnings: [
			{ message: messages.expectedBefore('.card', '.card:hover') },
			{ message: messages.expectedAfter('.card:hover::before', '.card::before') },
		],
	}],
});

testRule({
	description: 'Nested SCSS BEM families',
	config: [true],
	reject: [{
		description: 'Orders block states, modifiers, and elements while retaining the element contents',
		code: `
			.card {
				display: block;

				&__title {
					&:active {}
					&:hover {}
				} // 📌 The entire element follows the block modifier.

				&--compact {}

				&:hover {}
			}
		`,
		fixed: `
			.card {
				display: block;

				&:hover {}

				&--compact {}

				&__title {
					&:hover {}
					&:active {}
				} // 📌 The entire element follows the block modifier.
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('&:hover', '&:active') },
			{ message: messages.expectedBefore('&:hover', '&__title') },
			{ message: messages.expectedBefore('&--compact', '&__title') },
		],
	}, {
		description: 'Resolves a saved block reference while preserving the authored Sass interpolation',
		code: `
			.card {
				$b: #{&};

				#{$b}__title:hover {}

				#{$b}--compact {} // 📌 The resolved block modifier precedes the element family.

				#{$b}__title {}
			}
		`,
		fixed: `
			.card {
				$b: #{&};

				#{$b}--compact {} // 📌 The resolved block modifier precedes the element family.

				#{$b}__title {}

				#{$b}__title:hover {}
			}
		`,
		warnings: [{ message: messages.expectedAfter('#{$b}__title:hover', '#{$b}__title') }],
	}],
});

testRule({
	description: 'BEM ancestor contexts',
	config: [true],
	accept: [{
		description: 'Preserves the authored order of contexts from the same block',
		code: `
			.card__title {}
			.card--featured .card__title {} // 📌 Both modifiers are internal and have equal priority.
			.card--compact .card__title {}
			.feed--dense .card__title {}
		`,
	}],
	reject: [{
		description: 'Keeps both contexts with their target element and orders the internal context first',
		code: `
			.card__title {}
			.feed--dense .card__title {} // 📌 The feed block provides an external context for the title.
			.card__icon {}
			.card--compact .card__title {} // 📌 The card block modifies its own title.
		`,
		fixed: `
			.card__title {}
			.card--compact .card__title {} // 📌 The card block modifies its own title.
			.feed--dense .card__title {} // 📌 The feed block provides an external context for the title.
			.card__icon {}
		`,
		warnings: [{ message: messages.expectedBefore('.card--compact .card__title', '.feed--dense .card__title') }],
	}],
});

testRule({
	description: 'Nested SCSS ancestor contexts',
	config: [true, {
		order: ['context:external', 'pseudo-classes', 'context:internal'],
	}],
	reject: [{
		description: 'Places the local hover state between the external and internal contexts of an element',
		code: `
			.card__title {
				.card--compact & {} // 📌 The trailing & resolves to .card__title.
				.feed--dense & {}
				&:hover {}
			}
		`,
		fixed: `
			.card__title {
				.feed--dense & {}
				&:hover {}
				.card--compact & {} // 📌 The trailing & resolves to .card__title.
			}
		`,
		warnings: [{ message: messages.expectedAfter('.card--compact &', '&:hover') }],
	}],
});

testRule({
	description: 'Recursive BEM ordering configuration',
	config: [true, {
		order: ['pseudo-classes', 'base', 'elements', 'modifiers'],
	}],
	reject: [{
		description: 'Applies the same custom category order inside block, element, and modifier families',
		code: `
			.button {}
			.button--compact {}
			.button__icon {}
			.button:hover {} // 📌 States precede base rules at every family level.
			.button--compact:hover {}
			.button__icon:hover {}
		`,
		fixed: `
			.button:hover {} // 📌 States precede base rules at every family level.
			.button {}
			.button__icon:hover {}
			.button__icon {}
			.button--compact:hover {}
			.button--compact {}
		`,
		warnings: [
			{ message: messages.expectedBefore('.button:hover', '.button') },
			{ message: messages.expectedBefore('.button__icon:hover', '.button__icon') },
			{ message: messages.expectedAfter('.button--compact', '.button--compact:hover') },
		],
	}],
});
