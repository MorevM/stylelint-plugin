import { stripIndent } from '@morev/utils';
import { mergeMessages } from './merge-messages';

describe(mergeMessages, () => {
	it('Preserves all plugin messages if `userMessages` is undefined', () => {
		const ruleMessages = {
			block: (value: string) => `block:${value}`,
			element: (value: number) => `element:${value}`,
		};

		const merged = mergeMessages(ruleMessages, undefined);

		expect(merged.block('test')).toBe('block:test');
		expect(merged.element(42)).toBe('element:42');
	});

	it('Overrides plugin messages with user messages (if it returns `string`)', () => {
		const ruleMessages = {
			block: (value: string) => `block:${value}`,
			element: (value: number) => `element:${value}`,
		};

		const userMessages = {
			block: (value: string) => `custom:${value}`,
		};

		const merged = mergeMessages(ruleMessages, userMessages);

		expect(merged.block('test')).toBe('custom:test');
		expect(merged.element(42)).toBe('element:42');
	});

	it('Falls back to rule message if user message returns non-string', () => {
		const ruleMessages = {
			block: (value: string) => `plugin:${value}`,
		};

		const userMessages = {
			block: (value: string) => undefined as unknown as string,
		};

		const merged = mergeMessages(ruleMessages, userMessages);

		expect(merged.block('test')).toBe('plugin:test');
	});

	it('Applies `stripIndent` to plugin and user messages output', () => {
		const ruleMessages = {
			block: (value: string) => `
				Rule, block:
				${value}
			`,
			name: (value: string) => `
				Rule, name:
				${value}
			`,
		};

		const userMessages = {
			name: (value: string) => `
				User, name:
				${value}
			`,
		};

		const merged = mergeMessages(ruleMessages, userMessages);

		expect(merged.block('test')).toBe(stripIndent(`
			Rule, block:
			test
		`));

		expect(merged.name('test')).toBe(stripIndent(`
			User, name:
			test
		`));
	});

	// eslint-disable-next-line vitest/expect-expect -- Typecheck
	it('Infers correct argument types', () => {
		const ruleMessages = {
			block: (value: string, count: number) => `${value}${count}`,
		};

		const merged = mergeMessages(ruleMessages, undefined);

		// Should work
		merged.block('test', 123);

		// @ts-expect-error --  Should not allow incorrect argument types
		merged.block(123, 456);
	});
});
