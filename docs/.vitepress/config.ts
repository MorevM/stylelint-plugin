import { fileURLToPath } from 'node:url';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vitepress';
import { rulesMeta, scopedRulesMeta } from '../../src/modules/meta/index';

export default defineConfig({
	srcDir: fileURLToPath(new URL('../..', import.meta.url)),
	title: '@morev/stylelint-plugin',
	description: 'Stylelint rules for BEM and SCSS best practices',

	vite: {
		publicDir: fileURLToPath(new URL('../public', import.meta.url)),
		plugins: [
			Components({
				dirs: [
					fileURLToPath(new URL('./components', import.meta.url)),
				],
				dts: fileURLToPath(new URL('../components.d.ts', import.meta.url)),
				include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
				extensions: ['vue', 'md'],
			}) as any,
		],
		resolve: {
			alias: {
				'#modules/meta': fileURLToPath(new URL('../../src/modules/meta/index.ts', import.meta.url)),
			},
		},
		css: {
			preprocessorOptions: {
				scss: { api: 'modern-compiler' },
			},
		},
	},

	rewrites: {
		...rulesMeta.reduce<Record<string, string>>((acc, ruleEntry) => {
			acc[ruleEntry.docsPath] = ruleEntry.vitepressPath.slice(1);
			return acc;
		}, {}),
		'docs/:name(.+).md': ':name.md',
	},

	themeConfig: {
		logo: '/logo.svg',
		outline: [2, 3],
		nav: [
			{ text: 'Rules', link: '/rules' },
		],
		sidebar: [
			{
				text: 'Guide',
				items: [
					{
						text: 'Installation & usage',
						link: 'guide/installation-and-usage.md',
					},
				],
			},
			{
				text: 'Rules',
				link: 'rules.md',
				items: scopedRulesMeta.map((scopeEntry) => ({
					text: scopeEntry.label,
					items: scopeEntry.items.map((ruleEntry) => ({
						text: ruleEntry.name,
						link: ruleEntry.vitepressPath,
					})),
				})),
			},
		],
	},
});
