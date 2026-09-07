import postcssScss from 'postcss-scss';
import { getSassVariableRenameFix } from './get-sass-variable-rename-fix';
import type { Declaration, Rule } from 'postcss';

describe(getSassVariableRenameFix, () => {
	it('Renames SASS-equivalent references across mutable fields', () => {
		const root = postcssScss.parse(`
			.block {
				$source_name: #{&}__item;
				color: $source-name;
				--#{$source_name}: #{$source-name};
				@media ($source-name: 1) {}
				&--#{$source_name} {}
			}
		`);
		const declaration = (root.first as Rule).first as Declaration;
		const fix = getSassVariableRenameFix(root, declaration, '$source-name');

		expect(fix).toBeTypeOf('function');

		fix?.();

		expect(root.toString()).toBe(`
			.block {
				$source-name: #{&}__item;
				color: $source-name;
				--#{$source-name}: #{$source-name};
				@media ($source-name: 1) {}
				&--#{$source-name} {}
			}
		`);
	});

	it('Renames references in at-rule names and repeated interpolations', () => {
		const root = postcssScss.parse(`
			.block {
				$rule: supports;
				@#{$rule} (display: grid) {
					content: '#{$rule}: #{$rule}';
				}
			}
		`);
		const declaration = (root.first as Rule).first as Declaration;
		const fix = getSassVariableRenameFix(root, declaration, '$at-rule');

		expect(fix).toBeTypeOf('function');

		fix?.();

		expect(root.toString()).toBe(`
			.block {
				$at-rule: supports;
				@#{$at-rule} (display: grid) {
					content: '#{$at-rule}: #{$at-rule}';
				}
			}
		`);
	});

	it.each(['$target', 'selectors.$source'])(
		'Refuses a rename that could change the binding of `%s`',
		(reference) => {
			const root = postcssScss.parse(`
				.block {
					$source: #{&}__item;
					content: ${reference};
					&--active { content: $source; }
				}
			`);
			const declaration = (root.first as Rule).first as Declaration;
			const original = root.toString();

			expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
			expect(root.toString()).toBe(original);
		},
	);

	it.each(['variable-exists(source)', "meta.variable-exists('source')"])(
		'Refuses a rename when `%s` looks up a variable by name',
		(expression) => {
			const root = postcssScss.parse(`
				.block {
					$source: #{&}__item;
					@if ${expression} {
						#{$source} { color: red; }
					}
				}
			`);
			const declaration = (root.first as Rule).first as Declaration;
			const original = root.toString();

			expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
			expect(root.toString()).toBe(original);
		},
	);

	it('Refuses a rename when the target name already has a binding', () => {
		const root = postcssScss.parse(`
			.block {
				$source: #{&}__item;
				$target: #{&}__other;
				color: $source;
			}
		`);
		const declaration = (root.first as Rule).first as Declaration;

		expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
	});

	it('Refuses a rename across a callable parameter binding', () => {
		const root = postcssScss.parse(`
			.block {
				$source: #{&}__item;
				@mixin paint($source) {
					color: $source;
				}
			}
		`);
		const declaration = (root.first as Rule).first as Declaration;

		expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
	});

	it('Refuses a rename when a reference precedes the declaration', () => {
		const root = postcssScss.parse(`
			.before {
				color: $source;
			}
			.block {
				$source: #{&}__item;
				color: $source;
			}
		`);
		const declaration = (root.last as Rule).first as Declaration;

		expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
	});

	it('Refuses a rename of a global declaration', () => {
		const root = postcssScss.parse(`
			.block {
				$source: #{&}__item !global;
				color: $source;
			}
		`);
		const declaration = (root.first as Rule).first as Declaration;

		expect(getSassVariableRenameFix(root, declaration, '$target')).toBeUndefined();
	});
});
