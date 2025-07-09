import 'vitest';

interface CustomMatchers<T = any> {
	toShallowEqualArray: (expected: any[]) => T;
}

declare module 'vitest' {
	interface Matchers<T = any> extends CustomMatchers<T> {}
}
