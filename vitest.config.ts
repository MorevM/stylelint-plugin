import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		watch: false,
		setupFiles: ['./vitest.setup.ts'],
		globals: true,
		reporters: ['verbose'],
		coverage: {
			enabled: false,
			provider: 'v8',
			all: false,
		},
	},
});
