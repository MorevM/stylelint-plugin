import rule from '../no-selectors-in-at-rules';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName });

// @see https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
testRule({
	config: [true],
	description: 'Test for all CSS at-rules',
	accept: [
		{
			description: '@charset',
			code: `
				@charset "UTF-8";
			`,
		},
		{
			description: '@color-profile',
			code: `
				@color-profile --swop5c {
					src: url("https://example.org/SWOP2006_Coated5v2.icc");
				}
			`,
		},
		{
			description: '@container',
			code: `
				.the-component {
					@container (width > 400px) {
						font-size: 1.5em;
					}
				}
			`,
		},
		{
			description: '@counter-style',
			code: `
				@counter-style circled-alpha {
					system: fixed;
					symbols: Ⓐ Ⓑ Ⓒ Ⓓ Ⓔ Ⓕ Ⓖ Ⓗ Ⓘ Ⓙ Ⓚ Ⓛ Ⓜ Ⓝ Ⓞ Ⓟ Ⓠ Ⓡ Ⓢ Ⓣ Ⓤ Ⓥ Ⓦ Ⓧ Ⓨ Ⓩ;
					suffix: " ";
				}
			`,
		},
		{
			description: '@font-face',
			code: `
				@font-face {
					font-family: "Trickster";
					src:
						local("Trickster"),
						url("trickster-COLRv1.otf") format("opentype") tech(color-COLRv1),
						url("trickster-outline.otf") format("opentype"),
						url("trickster-outline.woff") format("woff");
				}
			`,
		},
		{
			description: '@font-feature-values',
			code: `
				@font-feature-values Font One {
					@styleset {
						nice-style: 12;
					}
				}
			`,
		},
		{
			description: '@font-palette-values',
			code: `
				@font-palette-values --identifier {
					font-family: Bixa;
				}
			`,
		},
		{
			description: '@import',
			code: `
				@import url("fineprint.css") print;
				@import url("bluish.css") projection, tv;
				@import 'custom.css';
				@import url("chrome://communicator/skin/");
				@import "common.css" screen, projection;
				@import url('landscape.css') screen and (orientation:landscape);
				@import url('landscape.css') screen and (orientation:landscape) layer(layer);
			`,
		},
		{
			description: '@keyframes',
			code: `
				@keyframes identifier {
					0% { top: 0; left: 0; }
					68%, 72% { left: 50px; }
					to { top: 100px; left: 100%; }
				}
			`,
		},
		{
			description: '@media',
			code: `
				.the-component {
					@media (--tablet-small) {
						font-size: smaller;
					}
				}
			`,
		},
		{
			description: '@namespace',
			code: `
				@namespace url(http://www.w3.org/1999/xhtml);
			`,
		},
		{
			description: '@page',
			code: `
				@page {
					size: 8.5in 9in;
					margin-top: 4in;
				}
			`,
		},
		{
			description: '@position-try',
			code: `
				@position-try --custom-left {
					position-area: left;
					width: 100px;
					margin: 0 10px 0 0;
				}
			`,
		},
		{
			description: '@property',
			code: `
				@property --item-size {
					syntax: "<percentage>";
					inherits: true;
					initial-value: 40%;
				}
			`,
		},
		{
			description: '@starting-style',
			code: `
				[popover]:popover-open {
					@starting-style {
						opacity: 0;
						transform: scaleX(0);
					}
				}
			`,
		},
		{
			description: '@supports',
			code: `
				body {
					@supports font-tech(color-COLRv1) {
						font-family: "Bungee Spice";
					}
				}
			`,
		},
		{
			description: '@view-transition',
			code: `
				@view-transition {
					navigation: auto;
				}
			`,
		},
	],
	reject: [
		{
			description: '@container',
			code: `
				@container (width > 400px) and style(--responsive: true) {
					h2 {
						font-size: 1.5em;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('h2', 'container'),
					line: 2, column: 2,
					endLine: 2, endColumn: 4,
				},
			],
		},
		{
			description: '@media',
			code: `
				@media (hover: hover) {
					abbr:hover {
						color: limegreen;
						transition-duration: 1s;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('abbr:hover', 'media'),
					line: 2, column: 2,
					endLine: 2, endColumn: 12,
				},
			],
		},
		{
			description: '@starting-style',
			code: `
				@starting-style {
					[popover]:popover-open {
						opacity: 0;
						transform: scaleX(0);
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('[popover]:popover-open', 'starting-style'),
					line: 2, column: 2,
					endLine: 2, endColumn: 24,
				},
			],
		},
		{
			description: '@layer',
			code: `
				@layer module {
					.alert {
						border: medium solid violet;
						background-color: yellow;
						color: white;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.alert', 'layer'),
					line: 2, column: 2,
					endLine: 2, endColumn: 8,
				},
			],
		},
		{
			description: '@scope',
			code: `
				@scope (.article-body) to (figure) {
					img {
						border: 5px solid black;
						background-color: goldenrod;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('img', 'scope'),
					line: 2, column: 2,
					endLine: 2, endColumn: 5,
				},
			],
		},
	],
});

// Default options
testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'SASS code',
			code: `
				@if ($modifier) {
					$modifiers: list.join('#{$separator}#{$modifier}', $modifiers);
				} @else {
					$modifiers: null;
				} @else if {
					$modifiers: null;
				}

				@while (true) {
					$modifiers: 0;
				}

				@for $i from 1 through 10 {
					$item: list.nth($list, $i);
				}
			`,
		},
		{
			description: 'SASS mixin without rules',
			code: `
				@include foo() {
					@include bar(123);
					border-color: $white;
					color: var(--some-color, #{$white});
					font-size: 12px;

					@include baz {
						color: red;
					}
				}
			`,
		},
		{
			description: 'Standard CSS at-rule without rules',
			code: `
				@media (min-width: 320px) {
					color: #fff;
				}
			`,
		},
		{
			description: 'CSS keyframes using percents',
			code: `
				@keyframes foo {
					0% { opacity: 0; }
					100% {
						@include transform(translate(-24px, -8px));
					}
				}
			`,
		},
		{
			description: 'CSS keyframes using keywords',
			code: `
				@keyframes foo {
					from { opacity: 0; }
					50% { opacity: 1; }
					to {
						@include transform(translate(-24px, -8px));
					}
				}
			`,
		},
		{
			description: 'SASS mixin within a rule',
			code: `
				.the-component {
					@include foo() {
						color: blue;

						@include bar() {
							color: red;
						}
					}
				}
			`,
		},
		{
			description: 'Standard at-rule within a rule',
			code: `
				.the-component {
					@media screen and (min-width: 320px) {
						color: red;
					}
				}
			`,
		},
		{
			customSyntax: 'postcss-scss',
			description: 'Comments inside at-rule',
			code: `
				.the-component {
					@media (width >= 320px) {
						// comment
						/* another comment */
						color: red;
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'SASS mixin with rules',
			code: `
				@include foo() {
					.the-component {
						color: red;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-component', 'include'),
					line: 2, column: 2,
					endLine: 2, endColumn: 16,
				},
			],
		},
		{
			description: 'Standard at-rule with rules',
			code: `
				@media screen and (min-width: 320px) {
					.the-component {
						color: red;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-component', 'media'),
					line: 2, column: 2,
					endLine: 2, endColumn: 16,
				},
			],
		},
		{
			description: 'Comments and selector inside at-rule',
			code: `
				@media (min-width: 320px) {
					/* comment */
					.the-component {
						color: red;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-component', 'media'),
					line: 3, column: 2,
					endLine: 3, endColumn: 16,
				},
			],
		},
		{
			description: 'Comments, declarations, and selector inside at-rule',
			code: `
				@media (min-width: 320px) {
					/* comment */
					color: red;

					.the-component {
						color: blue;
					}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-component', 'media'),
					line: 5, column: 2,
					endLine: 5, endColumn: 16,
				},
			],
		},
	],
});

// String wildcard
testRule({
	description: 'String wildcard',
	config: [true, {
		ignore: {
			media: '*',
		},
	}],
	accept: [
		{
			description: `Ignores any @media as configured`,
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				.the-component {
					@media print {
						&__el {}
					}
				}
			`,
		},
	],
	reject: [
		{
			// description: 'Ignores only @media as configured',
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				@include foo() {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'include'),
					line: 6, column: 2,
					endLine: 6, endColumn: 10,
				},
			],
		},
	],
});

// RegExp wildcard as string
testRule({
	description: 'RegExp wildcard as string',
	config: [true, {
		ignore: {
			media: '/.*/',
		},
	}],
	accept: [
		{
			description: `Ignores any @media as configured`,
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				.the-component {
					@media print {
						&__el {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Ignores only @media as configured',
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				@include foo() {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'include'),
					line: 6, column: 2,
					endLine: 6, endColumn: 10,
				},
			],
		},
	],
});

// RegExp wildcard as RegExp
testRule({
	description: 'RegExp wildcard as string',
	config: [true, {
		ignore: {
			media: /.*/,
		},
	}],
	accept: [
		{
			description: `Ignores any @media as configured`,
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				.the-component {
					@media print {
						&__el {}
					}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Ignores only @media as configured',
			code: `
				@media (min-width: 320px) {
					.the-component {}
				}

				@include foo() {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'include'),
					line: 6, column: 2,
					endLine: 6, endColumn: 10,
				},
			],
		},
	],
});

// String value
testRule({
	description: 'String value',
	config: [true, {
		ignore: {
			media: 'print',
		},
	}],
	accept: [
		{
			description: `Ignores @media print as configured`,
			code: `
				@media print {
					.the-component {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Ignores only @media print',
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'media'),
					line: 6, column: 2,
					endLine: 6, endColumn: 10,
				},
			],
		},
	],
});

// Array of string values
testRule({
	description: 'Array of string values',
	config: [true, {
		ignore: {
			media: ['print', '(print)'],
		},
	}],
	accept: [
		{
			description: `Ignores @media print as configured`,
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-component {}
				}
			`,
		},
	],
	reject: [
		{
			description: 'Ignores only @media print',
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-foo {}
				}

				@media not print {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'media'),
					line: 10, column: 2,
					endLine: 10, endColumn: 10,
				},
			],
		},
	],
});

// Array of string RegExp values
testRule({
	description: 'Array of string RegExp values',
	config: [true, {
		ignore: {
			media: ['/\\(?print\\)?/', '/.*--tablet-\(small|medium\).*/'],
		},
	}],
	accept: [
		{
			description: `Ignores @media print and --tablet-X as configured`,
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-component {}
				}

				@media (--tablet-small) {
					.the-component {}
				}

				@media (--tablet-medium) {
					.the-component {}
				}
			`,
		},
	],
	reject: [
		{
			description: `Ignores only @media print and --tablet-X as configured`,
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-foo {}
				}

				@media (--tablet-large) {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'media'),
					line: 10, column: 2,
					endLine: 10, endColumn: 10,
				},
			],
		},
	],
});

// Array of RegExp values
testRule({
	description: 'Array of string RegExp values',
	config: [true, {
		ignore: {
			media: [/\(?print\)?/, /.*--tablet-(?:medium|small).*/],
		},
	}],
	accept: [
		{
			description: `Ignores @media print and --tablet-X as configured`,
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-component {}
				}

				@media (--tablet-small) {
					.the-component {}
				}

				@media (--tablet-medium) {
					.the-component {}
				}
			`,
		},
	],
	reject: [
		{
			description: `Ignores only @media print and --tablet-X as configured`,
			code: `
				@media print {
					.the-component {}
				}

				@media (print) {
					.the-foo {}
				}

				@media (--tablet-large) {
					.the-foo {}
				}
			`,
			warnings: [
				{
					message: messages.unexpected('.the-foo', 'media'),
					line: 10, column: 2,
					endLine: 10, endColumn: 10,
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
			unexpected: (name: string, atRuleName: string) =>
				`Unexpected ${name} ${atRuleName}`,
		},
	}],
	reject: [
		{
			description: 'Uses custom messages if provided',
			code: `
				@media (width >= 768px) {
					.block {}
				}
			`,
			warnings: [
				{ message: `Unexpected .block media` },
			],
		},
	],
});
