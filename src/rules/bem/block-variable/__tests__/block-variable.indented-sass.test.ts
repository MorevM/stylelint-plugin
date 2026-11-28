import { stripIndent } from '@morev/utils';
import { compileStringAsync } from 'sass-embedded';
import rule from '../block-variable';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-sass' });

describe('Block variables in indented Sass', () => {
	const code = stripIndent(`
		.card
		  color: red
		  &__title
		    color: blue
	`);
	const fixed = stripIndent(`
		.card
		  $b: &
		  color: red
		  &__title
		    color: blue
	`);

	testRule({
		description: 'Autofix with postcss-sass',
		codeFilename: 'card.sass',
		config: [true, { interpolation: 'never' }],
		reject: [
			{
				description: 'Inserts the block variable with the surrounding indentation',
				code, fixed,
				warnings: [{ message: messages.missingVariable('$b') }],
			},
			{
				description: 'Preserves the fixed source on a second autofix',
				code: fixed, fixed,
				warnings: [],
			},
		],
	});

	it('Compiles to the same CSS after inserting the block variable', async () => {
		const original = await compileStringAsync(code, { syntax: 'indented' });
		const result = await compileStringAsync(fixed, { syntax: 'indented' });

		expect(result.css).toBe(original.css);
	});
});
