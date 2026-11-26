import scss from 'postcss-scss';
import { createContentInsertionChecker } from './create-content-insertion-checker';
import type { AtRule } from 'postcss';

describe(createContentInsertionChecker, () => {
	it('Finds nested content insertion while excluding mixin definitions', () => {
		const root = scss.parse(`
			@mixin wrapper { @content; }
			@media screen {
				.card { @include wrapper { @content; } }
			}
			.card { color: red; }
		`);
		const [definition, media, plain] = root.nodes;
		const hasContentInsertion = createContentInsertionChecker();

		expect(hasContentInsertion(definition)).toBe(false);
		expect(hasContentInsertion(media)).toBe(true);
		expect(hasContentInsertion(plain)).toBe(false);
	});

	it('Recognizes direct content and contents directives', () => {
		const root = scss.parse(`
			@mixin wrapper {
				@content;
				@CoNtEnTs;
			}
		`);
		const [content, contents] = (root.first as AtRule).nodes!;
		const hasContentInsertion = createContentInsertionChecker();

		expect(hasContentInsertion(content)).toBe(true);
		expect(hasContentInsertion(contents)).toBe(true);
	});

	it('Excludes native CSS definitions regardless of their ASCII letter case', () => {
		const root = scss.parse(`
			@MiXiN --wrapper { @CONTENTS; }
			@FUNCTION --token() { @CONTENTS; }
		`);
		const [mixin, fn] = root.nodes;
		const hasContentInsertion = createContentInsertionChecker();

		expect(hasContentInsertion(mixin)).toBe(false);
		expect(hasContentInsertion(fn)).toBe(false);
	});

	it('Does not mistake definitions, similar names or quoted text for content insertion', () => {
		const root = scss.parse(`
			@mixin wrapper { @content; }
			@function token() { @return "@content"; }
			@contentful;
			.card { content: "@content"; }
		`);
		const [mixin, fn, similar, rule] = root.nodes;
		const hasContentInsertion = createContentInsertionChecker();

		expect(hasContentInsertion(mixin)).toBe(false);
		expect(hasContentInsertion(fn)).toBe(false);
		expect(hasContentInsertion(similar)).toBe(false);
		expect(hasContentInsertion(rule)).toBe(false);
	});
});
