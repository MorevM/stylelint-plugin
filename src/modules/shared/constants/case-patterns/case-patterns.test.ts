import {
	CAMEL_CASE_NUMERIC_REGEXP,
	CAMEL_CASE_REGEXP,
	KEBAB_CASE_NUMERIC_REGEXP,
	KEBAB_CASE_REGEXP,
	PASCAL_CASE_NUMERIC_REGEXP,
	PASCAL_CASE_REGEXP,
	SNAKE_CASE_NUMERIC_REGEXP,
	SNAKE_CASE_REGEXP,
} from './case-patterns';

describe('constants > cases', () => {
	describe('KEBAB_CASE_REGEXP', () => {
		it('Accepts valid kebab-case', () => {
			expect(KEBAB_CASE_REGEXP.test('block')).toBe(true);
			expect(KEBAB_CASE_REGEXP.test('block-foo')).toBe(true);
			expect(KEBAB_CASE_REGEXP.test('block-foo-bar')).toBe(true);
			expect(KEBAB_CASE_REGEXP.test('b1ock-2foo')).toBe(true);
		});

		it('Rejects invalid kebab-case', () => {
			expect(KEBAB_CASE_REGEXP.test('Block')).toBe(false);
			expect(KEBAB_CASE_REGEXP.test('blockFoo')).toBe(false);
			expect(KEBAB_CASE_REGEXP.test('block_foo')).toBe(false);
			expect(KEBAB_CASE_REGEXP.test('1block')).toBe(false);
		});
	});

	describe('KEBAB_CASE_NUMERIC_REGEXP', () => {
		it('Accepts valid kebab-case with a number in front', () => {
			expect(KEBAB_CASE_NUMERIC_REGEXP.test('3cad')).toBe(true);
			expect(KEBAB_CASE_NUMERIC_REGEXP.test('3cad-label')).toBe(true);
			expect(KEBAB_CASE_NUMERIC_REGEXP.test('3cad-404')).toBe(true);
		});

		it('Rejects invalid kebab-case with a number in front', () => {
			expect(KEBAB_CASE_REGEXP.test('3Cad')).toBe(false);
			expect(KEBAB_CASE_REGEXP.test('block_3cad')).toBe(false);
		});
	});

	describe('PASCAL_CASE_REGEXP', () => {
		it('Accepts valid PascalCase', () => {
			expect(PASCAL_CASE_REGEXP.test('Block')).toBe(true);
			expect(PASCAL_CASE_REGEXP.test('BlockFoo')).toBe(true);
			expect(PASCAL_CASE_REGEXP.test('Block1Foo2')).toBe(true);
		});

		it('Rejects invalid PascalCase', () => {
			expect(PASCAL_CASE_REGEXP.test('block')).toBe(false);
			expect(PASCAL_CASE_REGEXP.test('blockFoo')).toBe(false);
			expect(PASCAL_CASE_REGEXP.test('Block_Foo')).toBe(false);
			expect(PASCAL_CASE_REGEXP.test('Block-Foo')).toBe(false);
		});
	});

	describe('PASCAL_CASE_NUMERIC_REGEXP', () => {
		it('Accepts valid PascalCase with a number in front', () => {
			expect(PASCAL_CASE_NUMERIC_REGEXP.test('3D')).toBe(true);
			expect(PASCAL_CASE_NUMERIC_REGEXP.test('3DoorsDown')).toBe(true);
		});

		it('Rejects invalid PascalCase with a number in front', () => {
			expect(PASCAL_CASE_NUMERIC_REGEXP.test('3D-block')).toBe(false);
			expect(PASCAL_CASE_NUMERIC_REGEXP.test('3D_block')).toBe(false);
		});
	});

	describe('CAMEL_CASE_REGEXP', () => {
		it('Accepts valid camelCase', () => {
			expect(CAMEL_CASE_REGEXP.test('block')).toBe(true);
			expect(CAMEL_CASE_REGEXP.test('blockFoo')).toBe(true);
			expect(CAMEL_CASE_REGEXP.test('block1Foo2')).toBe(true);
		});

		it('Rejects invalid camelCase', () => {
			expect(CAMEL_CASE_REGEXP.test('Block')).toBe(false);
			expect(CAMEL_CASE_REGEXP.test('block_foo')).toBe(false);
			expect(CAMEL_CASE_REGEXP.test('block-foo')).toBe(false);
		});
	});

	describe('CAMEL_CASE_NUMERIC_REGEXP', () => {
		it('Accepts valid camelCase with a number in front', () => {
			expect(CAMEL_CASE_NUMERIC_REGEXP.test('3D')).toBe(true);
			expect(CAMEL_CASE_NUMERIC_REGEXP.test('3DoorsDown')).toBe(true);
		});

		it('Rejects invalid camelCase with a number in front', () => {
			expect(CAMEL_CASE_NUMERIC_REGEXP.test('Block')).toBe(false);
			expect(CAMEL_CASE_NUMERIC_REGEXP.test('3D_block')).toBe(false);
			expect(CAMEL_CASE_NUMERIC_REGEXP.test('3D-block')).toBe(false);
		});
	});

	describe('SNAKE_CASE_REGEXP', () => {
		it('Accepts valid snake_case', () => {
			expect(SNAKE_CASE_REGEXP.test('block')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block_foo')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block_foo_bar')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block1_foo2')).toBe(true);
		});

		it('Rejects invalid snake_case', () => {
			expect(SNAKE_CASE_REGEXP.test('Block')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('blockFoo')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('block-foo')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('1block')).toBe(false);
		});
	});

	describe('SNAKE_CASE_NUMERIC_REGEXP', () => {
		it('Accepts valid snake_case with a number in front', () => {
			expect(SNAKE_CASE_NUMERIC_REGEXP.test('3cad')).toBe(true);
			expect(SNAKE_CASE_NUMERIC_REGEXP.test('3cad_label')).toBe(true);
			expect(SNAKE_CASE_NUMERIC_REGEXP.test('3cad_404')).toBe(true);
		});

		it('Rejects invalid snake_case with a number in front', () => {
			expect(SNAKE_CASE_NUMERIC_REGEXP.test('3Cad')).toBe(false);
			expect(SNAKE_CASE_NUMERIC_REGEXP.test('block-3cad')).toBe(false);
		});
	});
});
