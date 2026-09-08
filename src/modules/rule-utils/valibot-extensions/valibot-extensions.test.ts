import * as v from 'valibot';
import { DEFAULT_SEPARATORS } from '#modules/bem';
import { vFunction, vReadonly, vSeparatorsSchema } from './valibot-extensions';
import type { Separators } from '#modules/shared';

describe('Valibot extensions', () => {
	describe('Separator schema', () => {
		it('Keeps input, output, and defaults aligned with the domain contract', () => {
			expectTypeOf<v.InferInput<typeof vSeparatorsSchema>>().toEqualTypeOf<Partial<Separators> | undefined>();
			expectTypeOf<v.InferOutput<typeof vSeparatorsSchema>>().toEqualTypeOf<Separators | undefined>();

			expect(v.parse(vSeparatorsSchema, {})).toStrictEqual(DEFAULT_SEPARATORS);
		});
	});

	describe(vFunction, () => {
		it('Infers callback arguments and return values for configuration input', () => {
			const schema = vFunction([v.string(), v.number()], v.boolean());

			expectTypeOf<v.InferInput<typeof schema>>().toEqualTypeOf<
				(selector: string, count: number) => boolean
			>();
			expectTypeOf<v.InferOutput<typeof schema>>().toEqualTypeOf<
				(selector: string, count: number) => boolean
			>();

			const callback = vi.fn<v.InferInput<typeof schema>>((selector, count) => selector.length === count);

			expect(v.parse(schema, callback)('foo', 3)).toBe(true);
		});

		it('Distinguishes parsed callback arguments from arguments accepted by the wrapper', () => {
			const schema = vFunction(
				[v.pipe(v.string(), v.transform(Number))],
				v.pipe(v.number(), v.transform(String)),
			);

			expectTypeOf<v.InferInput<typeof schema>>().toEqualTypeOf<(count: number) => number>();
			expectTypeOf<v.InferOutput<typeof schema>>().toEqualTypeOf<(count: string) => string>();

			const callback = vi.fn((count: number) => count + 1);
			const wrapped = v.parse(schema, callback);

			expect(wrapped('2')).toBe('3');
			expect(callback).toHaveBeenCalledWith(2);
		});

		it('Preserves function, argument, and return value validation', () => {
			const schema = vFunction([v.string()], v.string());
			const callback = vi.fn((selector: string) => selector);
			const wrapped = v.parse(schema, callback);

			expect(() => v.parse(schema, 'invalid')).toThrow(v.ValiError);
			// @ts-expect-error Invalid arguments still fail at runtime for untyped consumers.
			expect(() => wrapped(123)).toThrow(v.ValiError);
			expect(callback).not.toHaveBeenCalled();
			expect(() => v.parse(schema, () => 123)('foo')).toThrow(v.ValiError);
		});
	});

	describe(vReadonly, () => {
		it('Preserves readonly callback contexts without changing runtime validation', () => {
			const context = v.strictObject({ path: vReadonly(v.array(v.string())) });
			const schema = vReadonly(context);

			expectTypeOf<v.InferInput<typeof schema>>().toEqualTypeOf<{ readonly path: readonly string[] }>();
			expectTypeOf<v.InferOutput<typeof schema>>().toEqualTypeOf<{ readonly path: readonly string[] }>();

			expect(schema).toBe(context);
			expect(v.parse(schema, { path: ['.block'] })).toStrictEqual({ path: ['.block'] });
			expect(v.safeParse(schema, { path: [123] }).success).toBe(false);
			expect(v.safeParse(schema, { path: [], unknown: true }).success).toBe(false);
		});
	});
});
