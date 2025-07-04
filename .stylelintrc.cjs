/** @type {import('stylelint').Config} */
module.exports = {
	plugins: [
		'./dist/index.js',
		'stylelint-selector-bem-pattern',
	],
	extends: [
		'@morev/stylelint-config/scss',
	],
	customSyntax: 'postcss-scss',
	rules: {
		// 'no-duplicate-selectors': true,
		// 'plugin/selector-bem-pattern': {
		// 	preset: 'bem',
		// },
		// 'aditayvm/at-rule-no-children': null,
		// 'scss/dollar-variable-colon-space-after': null,
		// //
		// '@morev/bem/match-file-name': [true, {}],
		// '@morev/bem/block-variable': [true, {
		// 	name: 'b',
		// }],
		// '@morev/bem/no-splitted-entities': [true, {}],
		// '@morev/bem/no-duplicated-selectors': [true, {}],
		// '@morev/bem/no-side-effects': [true, {}],
		'@morev/bem/pattern': [true, {}],
		// '@morev/bem/no-unused-variables': [true, {}],
		// '@morev/bem/no-external-geometry': [true, {}],
		// '@morev/bem/no-selectors-in-at-rules': [true, {
		// 	ignore: {
		// 		layer: '*',
		// 		media: ['print'],
		// 	},
		// }],
	},
};
