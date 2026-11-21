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
					'sass:diagnostics',
				],
				'custom-properties',
				'rules',
				'css:media',
				'css:container',
				'at-rules',
			],
			unspecified: 'bottom',
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

			'css:media',
			'css:container',

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

		categories: {
			'css:media': [
				/\(--less-phone-small\)/u,
				/\(--phone-small\)/u,
				/\(--less-phone-medium\)/u,
				/\(--phone-medium\)/u,
				/\(--less-phone-large\)/u,
				/\(--phone-large\)/u,

				/\(--less-tablet-small\)/u,
				/\(--tablet-small\)/u,
				/\(--less-tablet-medium\)/u,
				/\(--tablet-medium\)/u,
				/\(--less-tablet-large\)/u,
				/\(--tablet-large\)/u,

				/\(--less-laptop-small\)/u,
				/\(--laptop-small\)/u,
				/\(--less-laptop-medium\)/u,
				/\(--laptop-medium\)/u,
				/\(--less-laptop-large\)/u,
				/\(--laptop-large\)/u,

				/\(--less-desktop\)/u,
				/\(--desktop\)/u,
				/\(--less-desktop-2k\)/u,
				/\(--desktop-2k\)/u,
				/\(--less-desktop-4k\)/u,
				/\(--desktop-4k\)/u,

				'*',
			],
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
