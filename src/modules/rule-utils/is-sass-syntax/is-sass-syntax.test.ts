import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import stylelint from 'stylelint';
import { isSassSyntax } from './is-sass-syntax';
import type { Root, Syntax } from 'postcss';
import type { LinterOptions, PostcssResult } from 'stylelint';

/**
 * Captures classification inside a rule so Stylelint supplies the processing metadata.
 *
 * @returns   Probe plugin and its observed classifications.
 */
const createSyntaxProbe = () => {
	const detected: boolean[] = [];
	const checkSyntax = (root: Root, result: PostcssResult) => {
		detected.push(isSassSyntax(root, result));
	};
	const ruleName = 'test/sass-syntax';
	const rule = Object.assign(() => checkSyntax, { ruleName, messages: {} });
	const plugin = stylelint.createPlugin(ruleName, rule);
	return { detected, plugin };
};

/**
 * Observes syntax detection with Stylelint's actual parser selection and fixing options.
 *
 * @param   options   Syntax, filename, and fixing settings for one stylesheet.
 *
 * @returns           Classification observed by the probe rule.
 */
const isSassFromLint = async (options: Pick<LinterOptions, 'customSyntax' | 'codeFilename' | 'fix'>) => {
	const { detected, plugin } = createSyntaxProbe();
	await stylelint.lint({
		code: '.block {}',
		...options,
		config: { plugins: [plugin], rules: { 'test/sass-syntax': true } },
	});

	expect(detected).toHaveLength(1);

	return detected[0];
};

describe(isSassSyntax, () => {
	it('Gives a CSS filename priority over an SCSS parser', async () => {
		await expect(isSassFromLint({ codeFilename: 'component.css', customSyntax: 'postcss-scss' })).resolves.toBe(false);
	});

	it.each(['component.scss', 'component.sass'])(
		'Gives a Sass filename priority over the default parser: %s',
		async (codeFilename) => {
			await expect(isSassFromLint({ codeFilename })).resolves.toBe(true);
		},
	);

	it.each([false, 'lax'] as const)('Keeps Sass checks disabled for filename-less CSS with fix mode %s', async (fix) => {
		await expect(isSassFromLint({ fix })).resolves.toBe(false);
	});

	it.each(['component', 'component.liquid'])('Uses explicit syntax for an unrecognized filename: %s', async (codeFilename) => {
		await expect(isSassFromLint({ codeFilename })).resolves.toBe(false);
		await expect(isSassFromLint({ codeFilename, customSyntax: 'postcss-scss' })).resolves.toBe(true);
	});

	it('Keeps Sass checks disabled for an explicitly configured native CSS parser', async () => {
		await expect(isSassFromLint({ customSyntax: postcss })).resolves.toBe(false);
	});

	it('Recognizes the SCSS identifier but leaves syntax objects unknown without a filename', async () => {
		await expect(isSassFromLint({ customSyntax: 'postcss-scss' })).resolves.toBe(true);
		await expect(isSassFromLint({ customSyntax: postcssScss })).resolves.toBe(false);
	});

	it('Recognizes the SCSS identifier from a matching configuration override', async () => {
		const { detected, plugin } = createSyntaxProbe();
		await stylelint.lint({
			code: '.block {}',
			codeFilename: 'component.styles',
			config: {
				plugins: [plugin],
				rules: { 'test/sass-syntax': true },
				overrides: [{ files: ['**/*.styles'], customSyntax: 'postcss-scss' }],
			},
		});

		expect(detected).toStrictEqual([true]);
	});

	it('Leaves wrapped SCSS parsers unknown even with shared SCSS serialization', async () => {
		const customSyntax: Syntax = {
			parse(source, options) {
				return postcssScss.parse(source, options);
			},
			stringify: postcssScss.stringify,
		};

		await expect(isSassFromLint({ customSyntax, fix: 'lax' })).resolves.toBe(false);
	});

	it('Does not infer Sass from a bare parser when Stylelint runs as a PostCSS plugin', async () => {
		const { detected, plugin } = createSyntaxProbe();
		await postcss([stylelint({ plugins: [plugin], rules: { 'test/sass-syntax': true } })])
			.process('.block {}', { from: undefined, parser: postcssScss.parse });

		expect(detected).toStrictEqual([false]);
	});
});
