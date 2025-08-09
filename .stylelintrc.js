/** @type {import('stylelint').Config} */
export default {
	extends: [
		'@morev/stylelint-config',
	],
	overrides: [
		{
			files: ['temp/**/*.scss', 'temp/**/*.css'],
			plugins: ['./dist/index.js'],
			rules: {
				'aditayvm/at-rule-no-children': null,
				//
				'@morev/base/no-selectors-in-at-rules': [true, {
					ignore: { layer: '*', media: ['print'] },
				}],
				'@morev/bem/block-variable': [true, {}],
				'@morev/bem/match-file-name': [true, {}],
				'@morev/bem/no-block-properties': [true, {
					presets: ['EXTERNAL_GEOMETRY', 'CONTEXT'],
				}],
				'@morev/bem/no-chained-entities': [true, {}],
				'@morev/bem/no-side-effects': [true, {}],
				'@morev/bem/selector-pattern': [true, {}],
				'@morev/sass/no-unused-variables': [true, {
					ignore: ['b'],
				}],
			},
		},
	],
};
