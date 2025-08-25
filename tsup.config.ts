import { defineConfig } from 'tsup';

export default defineConfig(() => {
	return {
		sourcemap: false,
		clean: true,
		target: 'esnext',
		format: ['cjs', 'esm'],
		dts: true,
		external: [
			'postcss',
			'stylelint',
			'@morev/utils',
		],
		entryPoints: [
			'src/index.ts',
			'src/constants.ts',
		],
		outExtension: ({ format }) => ({ js: format === 'cjs' ? `.${format}` : `.js` }),
	};
});
