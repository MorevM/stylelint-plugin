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
	defineConfiguration('typescript'),
]);
