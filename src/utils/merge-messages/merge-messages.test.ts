import { mergeMessages } from './merge-messages';

describe(mergeMessages, () => {
	it('Preserves all plugin messages if `userMessages` is undefined', () => {
		const pluginMessages = {
			block: (value: string) => `block:${value}`,
			element: (value: number) => `element:${value}`,
		};

		const merged = mergeMessages(pluginMessages, undefined);

		expect(merged.block('test')).toBe('block:test');
		expect(merged.element(42)).toBe('element:42');
	});

	it('Overrides plugin messages with user messages', () => {
		const pluginMessages = {
			block: (value: string) => `block:${value}`,
			element: (value: number) => `element:${value}`,
		};

		const userMessages = {
			block: (value: string) => `custom:${value}`,
		};

		const merged = mergeMessages(pluginMessages, userMessages);

		expect(merged.block('test')).toBe('custom:test');
		expect(merged.element(42)).toBe('element:42');
	});

	// eslint-disable-next-line vitest/expect-expect -- Typecheck
	it('Infers correct argument types', () => {
		const pluginMessages = {
			block: (value: string, count: number) => `${value}${count}`,
		};

		const merged = mergeMessages(pluginMessages, undefined);

		// Should work
		merged.block('test', 123);

		// @ts-expect-error --  Should not allow incorrect argument types
		merged.block(123, 456);
	});
});
