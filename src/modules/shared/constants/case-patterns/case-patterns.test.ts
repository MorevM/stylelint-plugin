import { CAMEL_CASE_REGEXP, KEBAB_CASE_REGEXP, PASCAL_CASE_REGEXP, SNAKE_CASE_REGEXP } from './case-patterns';

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

	describe('SNAKE_CASE_REGEXP', () => {
		it('Accepts valid SNAKE_CASE_REGEXP', () => {
			expect(SNAKE_CASE_REGEXP.test('block')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block_foo')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block_foo_bar')).toBe(true);
			expect(SNAKE_CASE_REGEXP.test('block1_foo2')).toBe(true);
		});

		it('Rejects invalid SNAKE_CASE_REGEXP', () => {
			expect(SNAKE_CASE_REGEXP.test('Block')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('blockFoo')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('block-foo')).toBe(false);
			expect(SNAKE_CASE_REGEXP.test('1block')).toBe(false);
		});
	});
});
