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
	'@morev/bem/no-misplaced-relational-styles': [true, {}],
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
			},
		},
	],
};
