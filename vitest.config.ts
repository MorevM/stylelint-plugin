import { configDefaults, defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
		watch: false,
		setupFiles: ['./vitest.setup.ts'],
		globals: true,
		reporters: ['verbose'],
		coverage: {
			enabled: false,
			provider: 'v8',
			exclude: ['./src/modules/test-utils/**'],
		},
	},
});
