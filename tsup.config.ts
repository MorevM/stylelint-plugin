import type { Options } from 'tsup';

export const tsup: Options = {
	sourcemap: false,
	clean: true,
	target: 'esnext',
	format: ['cjs', 'esm'],
	dts: {
		entry: 'src/index.ts',
	},
	external: [
		'postcss',
		'stylelint',
		'@morev/utils',
	],
	entryPoints: [
		'src/index.ts',
	],
	outExtension: ({ format }) => ({ js: format === 'cjs' ? `.${format}` : `.js` }),
};
