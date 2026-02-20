import { combine, defineConfiguration, defineIgnores } from '@morev/eslint-config';

export default combine([
	defineIgnores(),
	defineConfiguration('javascript'),
	defineConfiguration('node'),
	defineConfiguration('json'),
	defineConfiguration('markdown', {
		overrides: {
			// https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/256
			'markdown-preferences/no-implicit-block-closing': 'off',
		},
	}),
	defineConfiguration('yaml'),
	defineConfiguration('html'),
	defineConfiguration('vitest', {
		overrides: {
			'vitest/require-hook': 'off',
		},
	}),
	defineConfiguration('vue', {
		typescript: true,
		version: 3,
		overrides: {
			// There is no i18n, English version only
			'vue/no-bare-strings-in-template': 'off',
		},
	}),
	defineConfiguration('typescript'),
]);
