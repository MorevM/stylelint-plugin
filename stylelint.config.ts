import { defineConfig } from '@morev/stylelint-config';
import localPlugin, { createDefineRules } from '@morev/stylelint-plugin';

const tempFiles = ['temp/**/*.scss', 'temp/**/*.css'];
const config = defineConfig({
	preset: 'scss',
	bem: {
		files: tempFiles,
	},
});

const defineLocalRules = createDefineRules();
const localRuleOverrides = defineLocalRules({
	'@morev/bem/order': [true, {
		root: {
			order: [
				[
					'sass:variables',
					'sass:functions',
					'sass:mixins',
					'css:functions',
					'css:mixins',
					'sass:placeholders',
					'sass:includes',
					{ type: 'at-rule', name: 'debug' },
					{ type: 'at-rule', name: 'warn' },
					{ type: 'at-rule', name: 'error' },
				],
				'custom-properties',
				'rules',
				'group:media',
				{ type: 'at-rule', name: 'container' },
				'at-rules',
				'*',
			],
		},

		order: [
			{ type: 'at-rule', name: 'function' },

			'sass:variables',
			'custom-properties',

			{ type: 'at-rule', name: 'extend' },
			'sass:include-statements',

			'declarations',
			'base',

			'group:structural-pseudo-classes',

			'sass:include-blocks',
			{ type: 'at-rule', name: 'starting-style' },

			'group:media',
			{ type: 'at-rule', name: 'container' },

			'pseudo-classes',

			'qualifiers:class',
			'qualifiers:attribute',
			'group:functional-pseudo-classes',
			'modifiers',

			'group:other-pseudo-elements',
			'group:prefixed-states',
			'pseudo-elements',

			'elements',

			'context:internal',
			'context:external',
			'rules',
			{ type: 'at-rule', name: 'at-root' },

			'group:specificity-increases',
		],

		within: {
			'pseudo-classes': [
				':link',
				':visited',
				':hover',
				':focus-within',
				':focus',
				':focus-visible',
				':active',
				'*',
			],
			'pseudo-elements': ['::marker', '::before', '::after', '*'],
		},

		groups: {
			'structural-pseudo-classes': [
				{ type: 'rule', relativeSelector: /^&:empty(?![\w-])/u },

				{ type: 'rule', relativeSelector: /^&:only-child(?![\w-])/u },
				{ type: 'rule', relativeSelector: /^&:only-of-type(?![\w-])/u },

				{ type: 'rule', relativeSelector: /^&:first-child(?![\w-])/u },
				{ type: 'rule', relativeSelector: /^&:last-child(?![\w-])/u },

				{ type: 'rule', relativeSelector: /^&:first-of-type(?![\w-])/u },
				{ type: 'rule', relativeSelector: /^&:last-of-type(?![\w-])/u },

				{ type: 'rule', relativeSelector: /^&:nth-child(?![\w-])/u },
				{ type: 'rule', relativeSelector: /^&:nth-last-child(?![\w-])/u },

				{ type: 'rule', relativeSelector: /^&:nth-of-type(?![\w-])/u },
				{ type: 'rule', relativeSelector: /^&:nth-last-of-type(?![\w-])/u },
			],

			'media': [
				{ type: 'at-rule', name: 'media', parameter: /\(--less-phone-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--phone-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-phone-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--phone-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-phone-large\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--phone-large\)/u },

				{ type: 'at-rule', name: 'media', parameter: /\(--less-tablet-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--tablet-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-tablet-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--tablet-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-tablet-large\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--tablet-large\)/u },

				{ type: 'at-rule', name: 'media', parameter: /\(--less-laptop-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--laptop-small\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-laptop-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--laptop-medium\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-laptop-large\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--laptop-large\)/u },

				{ type: 'at-rule', name: 'media', parameter: /\(--less-desktop\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--desktop\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-desktop-2k\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--desktop-2k\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--less-desktop-4k\)/u },
				{ type: 'at-rule', name: 'media', parameter: /\(--desktop-4k\)/u },

				{ type: 'at-rule', name: 'media' },
			],

			'functional-pseudo-classes': [
				{ type: 'rule', relativeSelector: /^&:(?:has|is|not)\(/u },
			],
			'other-pseudo-elements': [
				{ type: 'rule', selector: /^&::(?!marker\b|before\b|after\b)\w+/u },
			],
			'prefixed-states': [
				{ type: 'rule', selector: /^&:{1,2}-\w+/u },
			],
			'specificity-increases': [
				{ type: 'rule', selector: /^& \+ &/u },
				{ type: 'rule', selector: /^& >/u },
				{ type: 'rule', selector: /^& ~/u },
			],
		},
	}],
	'@morev/bem/no-misplaced-relational-styles': [true, {}],
	'@morev/sass/no-unused-variables': [true, { ignore: ['b'] }],
});

const configuredRuleNames = new Set([
	...Object.keys(config.rules ?? {}),
	...(config.overrides ?? [])
		.flatMap(({ rules }) => Object.keys(rules ?? {})),
]);

const localRuleNames = localPlugin.flatMap((plugin) => (
	'ruleName' in plugin ? [plugin.ruleName] : []
));

const automaticallyEnabledRules = Object.fromEntries(
	localRuleNames
		.filter((ruleName) => !configuredRuleNames.has(ruleName))
		.map((ruleName) => [ruleName, true]),
);

export { localRuleOverrides };

export default {
	...config,
	overrides: [
		...(config.overrides ?? []),
		{
			files: tempFiles,
			plugins: localPlugin,
			rules: {
				...automaticallyEnabledRules,
				...localRuleOverrides,
				'order/order': null,
			},
		},
	],
};
