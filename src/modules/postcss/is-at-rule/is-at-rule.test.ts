import postcss from 'postcss';
import { isAtRule } from './is-at-rule';

const createAtRule = (name: string) => postcss.atRule({ name });

const createDecl = () => postcss.decl({ prop: 'color', value: 'red' });

describe(isAtRule, () => {
	describe('Without `atRuleNames` filter', () => {
		it('Returns `false` for `undefined` input', () => {
			expect(isAtRule(undefined)).toBe(false);
		});

		it('Returns `false` for non-`AtRule` nodes', () => {
			expect(isAtRule(createDecl())).toBe(false);
		});

		it('Returns `true` for `AtRule` when no `atRuleNames` provided', () => {
			expect(isAtRule(createAtRule('media'))).toBe(true);
			expect(isAtRule(createAtRule('media'), undefined)).toBe(true);
		});

		it('Returns `true` for `AtRule` when empty `atRuleNames` list provided', () => {
			expect(isAtRule(createAtRule('supports'), [])).toBe(true);
		});
	});

	describe('With `atRuleNames` filter', () => {
		it('Returns `true` when `AtRule` name matches one of the provided `atRuleNames`', () => {
			expect(isAtRule(createAtRule('media'), ['media', 'supports'])).toBe(true);
		});

		it('Returns `false` when `AtRule` name does not match any of the provided `atRuleNames`', () => {
			expect(isAtRule(createAtRule('keyframes'), ['media', 'supports'])).toBe(false);
		});

		it('Returns `false` for `undefined` input with filter', () => {
			expect(isAtRule(undefined, ['keyframes'])).toBe(false);
		});

		it('Preserves case-sensitive matching by default and when explicitly requested', () => {
			const node = createAtRule('MEDIA');

			expect(isAtRule(node, ['media'])).toBe(false);
			expect(isAtRule(node, ['media'], {})).toBe(false);
			expect(isAtRule(node, ['media'], { ignoreCase: false })).toBe(false);
			expect(isAtRule(node, ['MEDIA'], { ignoreCase: false })).toBe(true);
		});
	});

	describe('With `ignoreCase` enabled', () => {
		it('Matches ASCII case variants without changing the node or requested names', () => {
			const node = createAtRule('MEDIA');
			const names = ['supports', 'MeDiA'];

			expect(isAtRule(node, names, { ignoreCase: true })).toBe(true);
			expect(isAtRule(createAtRule('media'), ['MEDIA'], { ignoreCase: true })).toBe(true);
			expect(node.name).toBe('MEDIA');
			expect(names).toStrictEqual(['supports', 'MeDiA']);
		});

		it('Rejects different names and partial matches', () => {
			const node = createAtRule('MEDIA');

			expect(isAtRule(node, ['supports'], { ignoreCase: true })).toBe(false);
			expect(isAtRule(node, ['med'], { ignoreCase: true })).toBe(false);
		});

		it('Keeps an omitted or empty name filter unrestricted', () => {
			const node = createAtRule('MEDIA');

			expect(isAtRule(node, undefined, { ignoreCase: true })).toBe(true);
			expect(isAtRule(node, [], { ignoreCase: true })).toBe(true);
		});

		it('Rejects undefined and non-at-rule nodes', () => {
			expect(isAtRule(undefined, ['media'], { ignoreCase: true })).toBe(false);
			expect(isAtRule(createDecl(), [], { ignoreCase: true })).toBe(false);
		});

		it('Does not fold non-ASCII characters', () => {
			// cspell:ignore MÉDIA média Édia ſupports -- Intentional non-ASCII names exercise case matching.
			expect(isAtRule(createAtRule('MÉDIA'), ['média'], { ignoreCase: true })).toBe(false);
			expect(isAtRule(createAtRule('MÉDIA'), ['mÉdia'], { ignoreCase: true })).toBe(true);
			expect(isAtRule(createAtRule('Keyframes'), ['keyframes'], { ignoreCase: true })).toBe(false);
			expect(isAtRule(createAtRule('ſupports'), ['supports'], { ignoreCase: true })).toBe(false);
		});
	});
});
