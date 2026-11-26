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

		it('Skips disallowed at-rule ancestors through allowed wrappers', () => {
			const root = parse(`
				@supports (display: grid) {
					@media (width > 1px) { .block {} }
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
			expect(result?.isBaseDeclaration).toBe(true);
		});

		it('Returns correct block for a BEM element', () => {
			const root = parse(`.block__element { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
			expect(result?.isBaseDeclaration).toBe(false);
		});

		it('Returns correct block for multiple selectors of the same block', () => {
			const root = parse(`.block--modifier, .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
			expect(result?.isBaseDeclaration).toBe(false);
		});

		it('Returns correct block for a selector like "html .block"', () => {
			const root = parse(`html .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.blockName).toBe('block');
			expect(result?.selector).toBe('.block');
			expect(result?.rule).toBeInstanceOf(Rule);
			expect(result?.isBaseDeclaration).toBe(true);
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

	describe('Declaration priority and metadata', () => {
		it('Uses a modified element as a fallback entity', () => {
			const root = parse(`.block__element--active { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'block', selector: '.block', isBaseDeclaration: false });
			expect(result?.rule).toBe(root.first);
		});

		it('Uses a block modifier as a fallback entity', () => {
			const root = parse(`.block--active { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'block', selector: '.block', isBaseDeclaration: false });
			expect(result?.rule).toBe(root.first);
		});

		it('Uses a block modifier value as a fallback entity', () => {
			const root = parse(`.block--size--large { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'block', selector: '.block', isBaseDeclaration: false });
			expect(result?.rule).toBe(root.first);
		});

		it('Uses mixed block and element selectors as fallback entities', () => {
			const root = parse(`.block, .block__element { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'block', selector: '.block', isBaseDeclaration: false });
			expect(result?.rule).toBe(root.first);
		});

		it('Finds a later base block declaration', () => {
			const root = parse(`.block__element {} .block--active {} .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.last);
			expect(result?.blockName).toBe('block');
			expect(result?.isBaseDeclaration).toBe(true);
		});

		it('Selects the first base declaration across different blocks', () => {
			const root = parse(`.foo__bar {} .bar__bar {} .bar {} .foo {}`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'bar', selector: '.bar', isBaseDeclaration: true });
			expect(result?.rule).toBe(root.nodes[2]);
		});

		it('Keeps the first fallback when no base declaration exists', () => {
			const root = parse(`.foo__bar {} .bar__bar {} .bar--active {}`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result).toMatchObject({ blockName: 'foo', selector: '.foo', isBaseDeclaration: false });
			expect(result?.rule).toBe(root.first);
		});

		it('Preserves the fallback when a later selector has no resolved BEM entity', () => {
			const root = parse(`.block__item {}`);
			root.append(new Rule({ selector: '.#{&}' }));
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.first);
			expect(result?.isBaseDeclaration).toBe(false);
		});

		it('Treats a list of base selectors as a base declaration', () => {
			const root = parse(`.block, .block { color: red; }`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.first);
			expect(result?.isBaseDeclaration).toBe(true);
		});

		it('Prefers a base declaration over an earlier mixed selector list', () => {
			const root = parse(`.block, .block--active {} .block {}`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.last);
			expect(result?.isBaseDeclaration).toBe(true);
		});

		it('Keeps the fallback instead of a directly nested base candidate', () => {
			const root = parse(`
				.block__item {
					.utility {}
				}
			`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.first);
			expect(result?.isBaseDeclaration).toBe(false);
		});

		it('Keeps the fallback instead of a base candidate nested through a media wrapper', () => {
			const root = parse(`
				.block__item {
					@media (width > 1px) {
						.utility {}
					}
				}
			`);
			const result = getBemBlock(root, DEFAULT_SEPARATORS);

			expect(result?.rule).toBe(root.first);
			expect(result?.isBaseDeclaration).toBe(false);
		});

		it('Uses custom separators when locating the base block', () => {
			const root = parse(`.block-title {} .block_active {} .block { color: red; }`);
			const result = getBemBlock(root, {
				element: '-', modifier: '_', modifierValue: '_',
			});

			expect(result?.rule).toBe(root.last);
			expect(result?.isBaseDeclaration).toBe(true);
		});
	});
});
