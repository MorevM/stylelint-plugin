import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeRegExp, formatSlashes } from '@morev/utils';
import { defineConfig } from 'vitepress';

const DOCS_POSTFIX = '.docs.md';
const ROOT_PATH = path.resolve(import.meta.dirname, '../..');
const RULES_DIRECTORY_PATH = path.resolve(ROOT_PATH, 'src/rules');

const docFiles = fs.globSync(`${RULES_DIRECTORY_PATH}/**/*${DOCS_POSTFIX}`);
const rulesData = docFiles
	.map((filePath) => formatSlashes(filePath, { to: '/' }))
	.reduce<Array<{ ruleName: string; relativePathFromRoot: string; vitepressPath: string }>>((acc, filePath) => {
		const [_, ruleName] = filePath.match(
			new RegExp(`\/([^\/]+)${escapeRegExp(DOCS_POSTFIX)}$`),
		)!;

		const relativePathFromRoot = formatSlashes(
			path.relative(ROOT_PATH, filePath),
			{ to: '/' },
		);

		acc.push({
			ruleName,
			relativePathFromRoot,
			vitepressPath: `rules/${ruleName}.md`,
		});
		return acc;
	}, []).sort((a, b) => a.ruleName > b.ruleName ? 1 : -1);

console.log(rulesData);

// const rules = [
// 	'at-rule-no-children',
// 	'block-variable',
// 	'match-file-name',
// 	'no-duplicated-selectors',
// 	'no-external-geometry',
// 	'no-contextual-properties',
// 	'no-side-effects',
// 	'no-splitted-entities',
// 	'pattern',
// ];

console.log(fileURLToPath(new URL('../public', import.meta.url)));

export default defineConfig({
	// site-level options
	srcDir: fileURLToPath(new URL('../..', import.meta.url)),
	title: 'VitePress',
	description: 'Just playing around.',

	vite: {
		publicDir: fileURLToPath(new URL('../public', import.meta.url)),
	},

	rewrites: {
		...rulesData.reduce<Record<string, string>>((acc, rule) => {
			acc[rule.relativePathFromRoot] = rule.vitepressPath;
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
				items: rulesData.map((ruleEntry) => ({
					link: ruleEntry.vitepressPath,
					text: ruleEntry.ruleName,
				})),
			},
		],
	},
});
