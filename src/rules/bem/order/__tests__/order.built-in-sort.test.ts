import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

for (const preset of [
	{ description: 'Omitted unit priorities', sort: { by: 'dimension' } },
	{ description: 'Empty unit priorities', sort: { by: 'dimension', units: [] } },
	{ description: 'Wildcard as the only unit priority', sort: { by: 'dimension', units: ['*'] } },
] as const) {
	testRule({
		description: preset.description,
		config: [true, { categories: { 'at-rules': { sort: preset.sort } } }],
		reject: [{
			description: 'Sorts each unit numerically within its existing slots',
			code: `
				@media (min-width: 40px) {}
				@media (min-width: 2rem) {}
				@media (min-width: 16px) {}
				@media (min-width: 1rem) {}
			`,
			fixed: `
				@media (min-width: 16px) {}
				@media (min-width: 1rem) {}
				@media (min-width: 40px) {}
				@media (min-width: 2rem) {}
			`,
			warnings: [{
				message: messages.expectedGroupBefore(
					'at-rules "@media (min-width: 16px)", "@media (min-width: 1rem)"', '@media (min-width: 40px)',
				),
			}],
		}],
	});
}

testRule({
	description: 'Implicit descending unit groups',
	config: [true, { categories: { 'at-rules': { sort: { by: 'dimension', direction: 'desc' } } } }],
	reject: [{
		description: 'Accepts new units, compares unit names without case and leaves unresolved slots fixed',
		code: `
			@media (min-width: 1REM) {}
			@media (min-width: 20em) {}
			@media (hover: hover) {}
			@media (min-width: 2rem) {}
			@media (min-width: 40em) {}
		`,
		fixed: `
			@media (min-width: 2rem) {}
			@media (min-width: 40em) {}
			@media (hover: hover) {}
			@media (min-width: 1REM) {}
			@media (min-width: 20em) {}
		`,
		warnings: [{
			message: messages.expectedGroupBefore(
				'at-rules "@media (min-width: 2rem)", "@media (min-width: 40em)"', '@media (min-width: 1REM)',
			),
		}],
	}],
});

testRule({
	description: 'Cascade constraints with implicit units',
	config: [true, { categories: { declarations: { sort: { by: 'dimension' } } } }],
	accept: [{
		description: 'Preserves repeated-property fallbacks',
		code: `
			.card {
				width: 40px;
				width: 2rem;
				width: 16px;
				width: 1rem;
			}
		`,
	}, {
		description: 'Keeps the source order when shorthand constraints would displace another unit',
		code: `
			.card {
				margin: 40px;
				padding: 2rem;
				margin-top: 16px;
				width: 1rem;
			}
		`,
	}],
});

testRule({
	description: 'Name sorting preset',
	config: [true, { categories: { 'bem:elements': { sort: { by: 'name' } } } }],
	reject: [{
		description: 'Sorts local element names while keeping their states attached',
		code: `
			.card__title {}
			.card__title:hover {}
			.card__icon {}
		`,
		fixed: `
			.card__icon {}
			.card__title {}
			.card__title:hover {}
		`,
		warnings: [{ message: messages.expectedBefore('.card__icon', '.card__title') }],
	}],
});

testRule({
	description: 'Dimension unit priorities',
	config: [true, {
		categories: { 'at-rules': { sort: { by: 'dimension', units: ['rem', 'px'] } } },
	}],
	reject: [{
		description: 'Orders units before magnitudes and accepts a compound condition with one literal size',
		code: `
			@media (width >= 40px) {}
			@media (width >= 2rem) and (hover: hover) {}
			@media (width >= 16px) {}
			@media (hover: hover) and (width >= 3rem) {}
			@media (width >= 1rem) {}
		`,
		fixed: `
			@media (width >= 1rem) {}
			@media (width >= 2rem) and (hover: hover) {}
			@media (hover: hover) and (width >= 3rem) {}
			@media (width >= 16px) {}
			@media (width >= 40px) {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (width >= 1rem)', '@media (width >= 2rem) and (hover: hover)') },
			{ message: messages.expectedBefore('@media (hover: hover) and (width >= 3rem)', '@media (width >= 16px)') },
			{ message: messages.expectedAfter('@media (width >= 40px)', '@media (width >= 16px)') },
		],
	}],
});

testRule({
	description: 'Wildcard dimension unit priority',
	config: [true, { categories: { 'at-rules': { sort: { by: 'dimension', units: ['vw', '*', 'px'] } } } }],
	reject: [{
		description: 'Sorts unlisted units in their own slots between explicit units and keeps print in place',
		code: `
			@media (width >= 1px) {}
			@media (width >= 20em) {}
			@media (width >= 3vw) {}
			@media (width >= 1vh) {}
			@media print {}
			@media (width >= 2em) {}
		`,
		fixed: `
			@media (width >= 3vw) {}
			@media (width >= 2em) {}
			@media (width >= 1vh) {}
			@media (width >= 20em) {}
			@media print {}
			@media (width >= 1px) {}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (width >= 2em)', '@media (width >= 1vh)') },
			{ message: messages.expectedAfter('@media (width >= 20em)', '@media (width >= 1vh)') },
			{ message: messages.expectedAfter('@media (width >= 1px)', '@media (width >= 1vh)') },
		],
	}],
});

testRule({
	description: 'Unresolved dimension values',
	config: [true, {
		categories: { 'at-rules': { sort: { by: 'dimension', units: ['rem'] } } },
	}],
	reject: [{
		description: 'Preserves unresolved slots and excludes them from diagnostics',
		code: `
			@media (min-width: 40rem) {} // 📌 Moves below 20rem.
			@media (hover: hover) {}
			@media (20rem < width < 60rem) {}
			@media (min-width: calc(10rem + 4px)) {}
			@media (min-width: $tablet) {}
			@media (min-width: 20rem), (orientation: landscape) {}
			@media (min-width: 800px) {}
			@media (min-width: 20rem) {} // 📌 Moves above 40rem.
		`,
		fixed: `
			@media (min-width: 20rem) {} // 📌 Moves above 40rem.
			@media (hover: hover) {}
			@media (20rem < width < 60rem) {}
			@media (min-width: calc(10rem + 4px)) {}
			@media (min-width: $tablet) {}
			@media (min-width: 20rem), (orientation: landscape) {}
			@media (min-width: 800px) {}
			@media (min-width: 40rem) {} // 📌 Moves below 20rem.
		`,
		warnings: [{ message: messages.expectedBefore('@media (min-width: 20rem)', '@media (min-width: 40rem)') }],
	}],
});

testRule({
	description: 'Descending dimension groups',
	config: [true, {
		root: { order: ['group:responsive'] },
		groups: {
			responsive: {
				order: [
					{ type: 'at-rule', name: 'media' },
					{ type: 'at-rule', name: 'container' },
					{ type: 'at-rule', name: 'include' },
				],
				sort: { by: 'dimension', units: ['px', 'rem'], direction: 'desc' },
			},
		},
	}],
	reject: [{
		description: 'Retains separate construction ranks and unit priorities when reversing magnitudes',
		code: `
			@media (width >= 1rem) {}
			@media (width >= 2rem) {}
			@media (width >= 800px) {}
			@container sidebar (width >= 10px) {}
			@container sidebar (width >= 20px) {}
			@include respond(1rem);
			@include respond(2rem);
		`,
		fixed: `
			@media (width >= 800px) {}
			@media (width >= 2rem) {}
			@media (width >= 1rem) {}
			@container sidebar (width >= 20px) {}
			@container sidebar (width >= 10px) {}
			@include respond(2rem);
			@include respond(1rem);
		`,
		warnings: [
			{ message: messages.expectedBefore('@media (width >= 800px)', '@media (width >= 1rem)') },
			{ message: messages.expectedBefore('@media (width >= 2rem)', '@media (width >= 1rem)') },
			{ message: messages.expectedBefore('@container sidebar (width >= 20px)', '@container sidebar (width >= 10px)') },
			{ message: messages.expectedBefore('@include respond(2rem)', '@include respond(1rem)') },
		],
	}],
});
