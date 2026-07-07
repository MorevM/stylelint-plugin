import {
	getTypeScriptCompletionNames,
	typeScriptCompletionMarker,
} from '#modules/test-utils';
import { createDefineRules } from './create-define-rules';

const autocompleteTestTimeoutMs = 10_000;

describe(createDefineRules, () => {
	it('Allows omitted globals and rules arguments', () => {
		const defineRules = createDefineRules();

		const rules = defineRules();

		expect(rules).toStrictEqual({});

		expectTypeOf<keyof typeof rules>().toEqualTypeOf<never>();
	});

	it('Preserves exact rule names and normalized rule values', () => {
		const defineRules = createDefineRules({});

		const rules = defineRules({
			'@morev/sass/no-unused-variables': [true, {
				checkRoot: true,
				ignore: ['b'],
			}],
		});

		expectTypeOf<keyof typeof rules>().toEqualTypeOf<'@morev/sass/no-unused-variables'>();
		expectTypeOf(rules).not.toHaveProperty('@morev/bem/block-variable');
		expectTypeOf(rules['@morev/sass/no-unused-variables']).toEqualTypeOf<[
			true,
			{
				checkRoot: true;
				ignore: ['b'];
			},
		]>();
	});

	it('Preserves exact rule names from const object literals', () => {
		const defineRules = createDefineRules({});

		const rules = defineRules({
			'@morev/sass/no-unused-variables': [true, { checkRoot: true }],
		} as const);

		expectTypeOf<keyof typeof rules>().toEqualTypeOf<'@morev/sass/no-unused-variables'>();
		expectTypeOf(rules['@morev/sass/no-unused-variables']).toEqualTypeOf<[
			true,
			{ checkRoot: true },
		]>();
	});

	it('Allows arbitrary secondary options without typing them explicitly', () => {
		const defineRules = createDefineRules({});

		const rules = defineRules({
			'@morev/bem/block-variable': [true, {
				firstChild: true,
				severity: 'warning',
			}],
		});

		expectTypeOf(rules['@morev/bem/block-variable']).toEqualTypeOf<[
			true,
			{
				firstChild: true;
				severity: 'warning';
				separators: undefined;
			},
		]>();
	});

	it('Accepts partial global separators', () => {
		const defineRules = createDefineRules({
			separators: {
				element: '__',
			},
		});

		const rules = defineRules({
			'@morev/bem/block-variable': [true, { firstChild: true }],
		});

		expectTypeOf(rules['@morev/bem/block-variable']).toEqualTypeOf<[
			true,
			{
				firstChild: true;
				separators: {
					readonly element: '__';
				};
			},
		]>();
	});

	it('Reflects global separators in BEM rule values', () => {
		const separators = {
			element: '__',
			modifier: '--',
			modifierValue: '_',
		} as const;

		const defineRules = createDefineRules({ separators });

		const rules = defineRules({
			'@morev/bem/block-variable': [true, { firstChild: true }],
		});

		expect(rules).toStrictEqual({
			'@morev/bem/block-variable': [true, {
				firstChild: true,
				separators,
			}],
		});

		expectTypeOf<keyof typeof rules>().toEqualTypeOf<'@morev/bem/block-variable'>();
		expectTypeOf(rules['@morev/bem/block-variable']).toEqualTypeOf<[
			true,
			{
				firstChild: true;
				separators: typeof separators;
			},
		]>();
	});

	it('Reflects omitted global separators in BEM rule values', () => {
		const defineRules = createDefineRules();

		const rules = defineRules({
			'@morev/bem/block-variable': [true, { firstChild: true }],
		});

		expect(rules).toStrictEqual({
			'@morev/bem/block-variable': [true, {
				firstChild: true,
				separators: undefined,
			}],
		});

		expectTypeOf(rules['@morev/bem/block-variable']).toEqualTypeOf<[
			true,
			{
				firstChild: true;
				separators: undefined;
			},
		]>();
	});

	describe('Diagnostics', () => {
		it('Rejects unknown rule names', () => {
			const defineRules = createDefineRules({});

			expect(defineRules).toBeTypeOf('function');

			defineRules({
				// @ts-expect-error Unknown plugin rule names are rejected.
				'@morev/unknown/rule': true,
			});
		});

		it('Rejects invalid secondary options', () => {
			const defineRules = createDefineRules({});

			expect(defineRules).toBeTypeOf('function');

			defineRules({
				// @ts-expect-error `firstChild` accepts a boolean value.
				'@morev/bem/block-variable': [true, { firstChild: 'true' }],
			});
		});

		it('Rejects plugin config objects in rules', () => {
			const defineRules = createDefineRules({});

			expect(defineRules).toBeTypeOf('function');

			defineRules({
				// @ts-expect-error `defineRules` accepts a direct rule map, not a plugin config object.
				globals: {},
				// @ts-expect-error `defineRules` accepts a direct rule map, not a plugin config object.
				rules: {},
			});
		});

		it('Rejects unknown global options', () => {
			// @ts-expect-error Unknown plugin global options are rejected.
			const defineRules = createDefineRules({ unknown: true });

			expect(defineRules).toBeTypeOf('function');
		});

		it('Rejects invalid global separators', () => {
			// @ts-expect-error Unknown separator options are rejected.
			const defineRulesWithUnknownSeparator = createDefineRules({ separators: { unknown: '__' } });
			// @ts-expect-error Separator options accept string values.
			const defineRulesWithInvalidSeparator = createDefineRules({ separators: { element: true } });

			expect(defineRulesWithUnknownSeparator).toBeTypeOf('function');
			expect(defineRulesWithInvalidSeparator).toBeTypeOf('function');
		});
	});

	describe('Autocompletion', () => {
		it('Suggests global options', () => {
			const completions = getTypeScriptCompletionNames(`
				import { createDefineRules } from './src/create-define-rules';

				createDefineRules({ ${typeScriptCompletionMarker} });
			`);

			expect(completions).toContain('separators');
		}, autocompleteTestTimeoutMs);

		it('Suggests separator options', () => {
			const completions = getTypeScriptCompletionNames(`
				import { createDefineRules } from './src/create-define-rules';

				createDefineRules({
					separators: { ${typeScriptCompletionMarker} },
				});
			`);

			expect(completions).toStrictEqual(expect.arrayContaining([
				'element',
				'modifier',
				'modifierValue',
			]));
		}, autocompleteTestTimeoutMs);

		it('Suggests rule names', () => {
			const completions = getTypeScriptCompletionNames(`
				import { createDefineRules } from './src/create-define-rules';

				const defineRules = createDefineRules({});
				defineRules({ ${typeScriptCompletionMarker} });
			`);

			expect(completions).toStrictEqual(expect.arrayContaining([
				'"@morev/bem/block-variable"',
				'"@morev/sass/no-unused-variables"',
			]));
			expect(completions).not.toStrictEqual(expect.arrayContaining([
				'globals',
				'rules',
			]));
		}, autocompleteTestTimeoutMs);

		it('Suggests rule secondary options', () => {
			const completions = getTypeScriptCompletionNames(`
				import { createDefineRules } from './src/create-define-rules';

				const defineRules = createDefineRules({});
				defineRules({
					'@morev/bem/block-variable': [true, { ${typeScriptCompletionMarker} }],
				});
			`);

			expect(completions).toStrictEqual(expect.arrayContaining([
				'firstChild',
				'interpolation',
				'messages',
				'name',
				'replaceBlockName',
				'separators',
			]));
			expect(completions).not.toStrictEqual(expect.arrayContaining([
				'disableFix',
				'message',
				'reportDisables',
				'severity',
				'url',
			]));
		}, autocompleteTestTimeoutMs);
	});
});
