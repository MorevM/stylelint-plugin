import { combine, defineConfiguration, defineIgnores } from '@morev/eslint-config';

export default combine([
	defineIgnores(),
	defineConfiguration('javascript'),
	defineConfiguration('node'),
	defineConfiguration('json'),
	defineConfiguration('markdown'),
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
