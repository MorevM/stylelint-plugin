import rule from '../order';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Function bodies',
	config: [true],
	reject: [{
		description: 'Moves Sass and CSS functions as whole definitions without sorting their bodies',
		code: `
			.card {}
			.button {}
			@function tone() {
				$tone: red;
				@debug $tone;
				$tone: blue;
				@return $tone;
			}
			@function --tone() {
				result: red;
				@media (width > 40rem) { result: blue; --tone: blue; }
				result: green;
				--tone: green;
			}
		`,
		fixed: `
			@function tone() {
				$tone: red;
				@debug $tone;
				$tone: blue;
				@return $tone;
			}
			@function --tone() {
				result: red;
				@media (width > 40rem) { result: blue; --tone: blue; }
				result: green;
				--tone: green;
			}
			.card {}
			.button {}
		`,
		warnings: [{ message: messages.expectedGroupBefore('at-rules "@function tone()", "@function --tone()"', '.card') }],
	}],
});

testRule({
	description: 'Sass constructs at document level',
	config: [true],
	accept: [{
		description: 'Keeps module directives, flow control, and nested definitions as boundaries',
		code: `
			@use "sass:math";
			.card {}
			@if true { .enabled {} }
			@else { .disabled {} }
			@mixin size { width: 4px; }
			.button {
				&:hover {}
				@mixin local { color: red; }
				color: black;
			}
		`,
	}],
	reject: [{
		description: 'Raises Sass definitions and placeholders while retaining function and variable dependencies',
		code: `
			@mixin reset {}

			.card {}

			// 📌 Document-level media follow selector families.
			@media screen {}

			// 📌 Definitions and their uses retain their relative order.
			@function twice($value) {
				@return $value * 2;
			}

			$size: twice(2px);

			@mixin size {
				width: $size;
			}

			%shared {
				display: block;
			}

			@include reset;
			@warn "Example";

			.button {
				@include size;
				@extend %shared;
			}
		`,
		fixed: `
			@mixin reset {}

			// 📌 Definitions and their uses retain their relative order.
			@function twice($value) {
				@return $value * 2;
			}

			$size: twice(2px);

			@mixin size {
				width: $size;
			}

			%shared {
				display: block;
			}

			@include reset;
			@warn "Example";

			.card {}

			.button {
				@include size;
				@extend %shared;
			}

			// 📌 Document-level media follow selector families.
			@media screen {}
		`,
		warnings: [
			{ message: messages.expectedAfter('.card', '@warn "Example"') },
			{ message: messages.expectedAfter('@media screen', '.button') },
		],
	}],
});

testRule({
	description: 'Document ordering defaults',
	config: [true],
	reject: [{
		description: 'Keeps root media after families and nested media before states, including inside layers',
		code: `
			@media screen {}

			// 📌 Nested media precede selector states.
			.card {
				&:hover {}

				@media screen {}
			}
			.card:hover {}

			// 📌 Layer contents use document ordering, including mixed-case at-rule names.
			@LaYeR components {
				@media screen {}

				.button:hover {}

				.button {}
			}
		`,
		fixed: `
			// 📌 Nested media precede selector states.
			.card {
				@media screen {}

				&:hover {}
			}
			.card:hover {}

			@media screen {}

			// 📌 Layer contents use document ordering, including mixed-case at-rule names.
			@LaYeR components {
				.button {}

				.button:hover {}

				@media screen {}
			}
		`,
		warnings: [
			{ message: messages.expectedBefore('@media screen', '&:hover') },
			{ message: messages.expectedBefore('.button', '@media screen') },
			{ message: messages.expectedBefore('.button:hover', '@media screen') },
			{ message: messages.expectedAfter('@media screen', '.card:hover') },
		],
	}],
});

testRule({
	description: 'Explicit document order',
	config: [true, {
		root: { order: ['group:conditions', 'rules'] },
		order: ['declarations', 'base', 'pseudo-classes', 'at-rules', 'rules'],
		within: { 'pseudo-classes': [':active', ':hover', '*'] },
		groups: { conditions: [{ type: 'at-rule', name: 'media' }] },
	}],
	reject: [{
		description: 'Shares groups and within while preserving the separate order inside families and selectors',
		code: `
			// 📌 Local priorities keep active before hover and media after states.
			.card {
				&:active {}
				&:hover {}

				@media screen {}
			}
			.card:active {}
			.card:hover {}

			// 📌 The explicit root group places document-level media before families.
			@media screen {}
		`,
		fixed: `
			// 📌 The explicit root group places document-level media before families.
			@media screen {}

			// 📌 Local priorities keep active before hover and media after states.
			.card {
				&:active {}
				&:hover {}

				@media screen {}
			}
			.card:active {}
			.card:hover {}
		`,
		warnings: [{ message: messages.expectedBefore('@media screen', '.card') }],
	}],
});

testRule({
	description: 'Protected stylesheet preamble',
	config: [true, {
		root: { order: ['rules', 'at-rules'] },
		within: { 'at-rules': [
			{ type: 'at-rule', name: 'namespace' },
			{ type: 'at-rule', name: 'charset' },
			{ type: 'at-rule', name: 'layer' },
			{ type: 'at-rule', name: 'import' }, '*',
		] },
	}],
	reject: [{
		description: 'Preserves charset, imports, layer statements, namespaces, and their comments during autofix',
		code: `
			@charset "UTF-8";

			// 📌 Layer-order statements and imports stay in the preamble.
			@layer reset, components;
			@import "reset.css";

			/* 📌 SVG namespace comments stay with their protected directive. */
			@namespace svg "http://www.w3.org/2000/svg";
			@NAMESPACE html "http://www.w3.org/1999/xhtml";

			// 📌 Ordinary media still move after selector families.
			@media screen {}

			.card {}
			.button {}
		`,
		fixed: `
			@charset "UTF-8";

			// 📌 Layer-order statements and imports stay in the preamble.
			@layer reset, components;
			@import "reset.css";

			/* 📌 SVG namespace comments stay with their protected directive. */
			@namespace svg "http://www.w3.org/2000/svg";
			@NAMESPACE html "http://www.w3.org/1999/xhtml";

			.card {}
			.button {}

			// 📌 Ordinary media still move after selector families.
			@media screen {}
		`,
		warnings: [{ message: messages.expectedAfter('@media screen', '.button') }],
	}],
});
