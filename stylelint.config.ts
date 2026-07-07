import { defineConfig } from '@morev/stylelint-config';

export default defineConfig({
	preset: 'scss',
	bem: {
		files: ['temp/**/*.scss', 'temp/**/*.css'],
	},
});
