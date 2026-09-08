import ts from 'typescript';
import {
	getTypeScriptCompletionDetails,
	getTypeScriptCompletionNames,
	getTypeScriptQuickInfo,
	typeScriptCompletionMarker,
} from '#modules/test-utils';
import { createDefineRules } from './create-define-rules';
import type { ProcessedPattern } from '#rules/bem/selector-pattern/selector-pattern.types';
import type { SelectorVariablePatternContext } from '#rules/bem/selector-variable-pattern/selector-variable-pattern.types';

const autocompleteTestTimeoutMs = 10_000;

const createSideEffectsSource = (options: string) => `
	import { createDefineRules } from './src/create-define-rules';

	const defineRules = createDefineRules();
	defineRules({ '@morev/bem/no-side-effects': [true, { ${options} }] });
`;


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
				readonly checkRoot: true;
				readonly ignore: readonly ['b'];
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
			{ readonly checkRoot: true },
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
				readonly firstChild: true;
				readonly severity: 'warning';
				readonly separators: undefined;
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
				readonly firstChild: true;
				readonly separators: {
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
				readonly firstChild: true;
				readonly separators: typeof separators;
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
				readonly firstChild: true;
				readonly separators: undefined;
			},
		]>();
	});

	it('Preserves contextual typing for callback options', () => {
		const defineRules = createDefineRules();

		defineRules({
			'@morev/bem/selector-variable-pattern': [true, {
				resolve: (context) => {
					expectTypeOf(context).toEqualTypeOf<SelectorVariablePatternContext>();

					return null;
				},
			}],
		});
	});

	it('Allows omitted selector variable pattern options', () => {
		const defineRules = createDefineRules();

		const rules = defineRules({
			'@morev/bem/selector-variable-pattern': true,
		});

		expect(rules).toStrictEqual({
			'@morev/bem/selector-variable-pattern': [true, { separators: undefined }],
		});

		expectTypeOf(rules['@morev/bem/selector-variable-pattern']).toEqualTypeOf<[
			true,
			{ readonly separators: undefined },
		]>();
	});

	it('Preserves readonly resolver context and nullable results', () => {
		const defineRules = createDefineRules();

		expect(defineRules({
			'@morev/bem/selector-variable-pattern': [true, {
				resolve: (context) => {
					// @ts-expect-error Resolver contexts remain readonly.
					context.selector.block = 'another';
					// @ts-expect-error Resolver paths remain readonly arrays.
					context.owner?.path.push('.another');
					return context.owner ? /element/ : undefined;
				},
				messages: {
					invalidName: (actualName, expected, context) => {
						expectTypeOf(actualName).toEqualTypeOf<string>();
						expectTypeOf(expected).toEqualTypeOf<string | RegExp>();
						expectTypeOf(context).toEqualTypeOf<SelectorVariablePatternContext>();

						return actualName;
					},
				},
			}],
		})).toHaveProperty('@morev/bem/selector-variable-pattern');
	});

	it('Infers complete selector-pattern message arguments', () => {
		const defineRules = createDefineRules();

		expect(defineRules({
			'@morev/bem/selector-pattern': [true, {
				messages: {
					block: (name, fullSelector, patterns) => {
						expectTypeOf(name).toEqualTypeOf<string>();
						expectTypeOf(fullSelector).toEqualTypeOf<string>();
						expectTypeOf(patterns).toEqualTypeOf<ProcessedPattern[]>();

						return fullSelector;
					},
					modifierValue: (name, fullSelector, patterns) => {
						expectTypeOf(patterns).toEqualTypeOf<ProcessedPattern[] | false>();

						return fullSelector;
					},
				},
			}],
		})).toHaveProperty('@morev/bem/selector-pattern');
	});

	it('Preserves narrow property violation contexts', () => {
		const defineRules = createDefineRules();

		expect(defineRules({
			'@morev/bem/no-block-properties': [true, {
				messages: {
					unexpected: (propertyName, selector, context, presetName) => {
						expectTypeOf(context).toEqualTypeOf<'block' | 'modifier'>();
						expectTypeOf(presetName).toEqualTypeOf<string | undefined>();

						return propertyName;
					},
				},
			}],
		})).toHaveProperty('@morev/bem/no-block-properties');
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

		it('Rejects incompatible callback arguments and return values', () => {
			const defineRules = createDefineRules();

			expect(defineRules).toBeTypeOf('function');

			defineRules({
				// @ts-expect-error The rejected selector is a string.
				'@morev/bem/no-side-effects': [true, { messages: { rejected: (selector: number) => selector.toFixed(0) } }],
			});
			defineRules({
				// @ts-expect-error Message callbacks must return a string.
				'@morev/bem/no-side-effects': [true, { messages: { rejected: () => 123 } }],
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
		it('Suggests schema-derived secondary options', () => {
			const completions = getTypeScriptCompletionNames(createSideEffectsSource(typeScriptCompletionMarker));

			expect(completions).toStrictEqual(expect.arrayContaining(['ignore', 'separators', 'messages']));
		}, autocompleteTestTimeoutMs);

		it('Suggests schema-derived separator options', () => {
			const completions = getTypeScriptCompletionNames(createSideEffectsSource(`separators: { ${typeScriptCompletionMarker} }`));

			expect(completions).toStrictEqual(expect.arrayContaining(['element', 'modifier', 'modifierValue']));
		}, autocompleteTestTimeoutMs);

		it('Suggests schema-derived message options', () => {
			const completions = getTypeScriptCompletionNames(createSideEffectsSource(`messages: { ${typeScriptCompletionMarker} }`));

			expect(completions).toStrictEqual(expect.arrayContaining(['rejected']));
		}, autocompleteTestTimeoutMs);

		it('Preserves ignore documentation and default', () => {
			const details = getTypeScriptCompletionDetails(createSideEffectsSource(typeScriptCompletionMarker), 'ignore');

			expect(ts.displayPartsToString(details?.documentation)).toContain('Selectors to ignore');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'default',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining('[]') })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves separators documentation and default', () => {
			const details = getTypeScriptCompletionDetails(createSideEffectsSource(typeScriptCompletionMarker), 'separators');

			expect(ts.displayPartsToString(details?.documentation)).toContain('BEM separators');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'default',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("element: '__'") })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves element separator documentation and default', () => {
			const details = getTypeScriptCompletionDetails(
				createSideEffectsSource(`separators: { ${typeScriptCompletionMarker} }`), 'element',
			);

			expect(ts.displayPartsToString(details?.documentation)).toContain('Separator between block and element');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'default',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("'__'") })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves modifier separator documentation and default', () => {
			const details = getTypeScriptCompletionDetails(
				createSideEffectsSource(`separators: { ${typeScriptCompletionMarker} }`), 'modifier',
			);

			expect(ts.displayPartsToString(details?.documentation)).toContain('Separator between block/element and modifier name');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'default',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("'--'") })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves modifier value separator documentation and default', () => {
			const details = getTypeScriptCompletionDetails(
				createSideEffectsSource(`separators: { ${typeScriptCompletionMarker} }`), 'modifierValue',
			);

			expect(ts.displayPartsToString(details?.documentation)).toContain('Separator between modifier name and modifier value');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'default',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("'--'") })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves rejected message documentation and parameter description', () => {
			const details = getTypeScriptCompletionDetails(
				createSideEffectsSource(`messages: { ${typeScriptCompletionMarker} }`), 'rejected',
			);

			expect(ts.displayPartsToString(details?.documentation)).toContain('Custom message for a rejected selector');
			expect(details?.tags).toStrictEqual(expect.arrayContaining([
				expect.objectContaining({
					name: 'param',
					text: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining('selector') })]),
				}),
			]));
		}, autocompleteTestTimeoutMs);

		it('Preserves the displayed callback parameter name', () => {
			const details = getTypeScriptCompletionDetails(createSideEffectsSource(`
				messages: { ${typeScriptCompletionMarker} }
			`), 'rejected');

			expect(ts.displayPartsToString(details?.displayParts)).toContain('(selector: string) => string');
		}, autocompleteTestTimeoutMs);

		it('Infers the consumer callback parameter from the schema', () => {
			const info = getTypeScriptQuickInfo(createSideEffectsSource(`
				messages: { rejected: (selector) => ${typeScriptCompletionMarker}selector }
			`));

			expect(ts.displayPartsToString(info?.displayParts)).toBe('(parameter) selector: string');
		}, autocompleteTestTimeoutMs);

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
