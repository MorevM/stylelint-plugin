import { parse, Rule } from 'postcss';
import { DEFAULT_SEPARATORS } from '#modules/bem/constants';
import { getBemBlock } from './get-bem-block';

describe(getBemBlock, () => {
	describe('Negative scenarios', () => {
		it('Returns `null` when no rules present', () => {
			const root = parse(``);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});

		it('Returns `null` for class selector with only "."', () => {
			const root = parse(`. { color: red; }`);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});

		it('Returns `null` when no class selectors present', () => {
			const root = parse(`body { color: red; }`);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});

		it('Returns `null` for rules that contain more than just classes', () => {
			const root = parse(`#foo, .foo-component { color: red; }`);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});

		it('Returns `null` for multiple classes if they belong to different bem blocks', () => {
			const root = parse(`.a, .b { color: red; }`);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});

		it('Skips rules inside disallowed at-rules', () => {
			const root = parse(`
				@supports (display: grid) {
					.block { color: red; }
				}
			`);

			expect(getBemBlock(root, DEFAULT_SEPARATORS)).toBeNull();
		});
	});

	describe('Positive scenarios', () => {
		it('Returns correct block for simple class selector', () => {
			const root = parse(`.block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Returns correct block for a BEM element', () => {
			const root = parse(`.block__element { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Returns correct block for multiple selectors of the same block', () => {
			const root = parse(`.block--modifier, .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Returns correct block for a selector like "html .block"', () => {
			const root = parse(`html .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Allows rules inside `@layer`', () => {
			const root = parse(`
				@layer components {
					.block { color: red; }
				}
			`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Allows rules inside `@media`', () => {
			const root = parse(`
				@media (width >= 768px) {
					.block { color: red; }
				}
			`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
		});

		it('Returns first valid block and ignores others', () => {
			const root = parse(`
				.block { color: red; }
				.another { color: blue; }
			`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
		});
	});
});
