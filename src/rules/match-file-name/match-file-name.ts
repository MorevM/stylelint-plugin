import path from 'node:path';
import { kebabCase, stripIndent } from '@morev/utils';
import * as v from 'valibot';
import { addNamespace, createRule, getBemBlock, getRuleUrl } from '#utils';

const RULE_NAME = 'match-file-name';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		match: (blockName: string) => `The file name must start with its block name: "${blockName}"`,
		matchCase: (blockName: string) => stripIndent(`
			The file name must start with its block name: "${blockName}", including correct case.
		`),
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				caseSensitive: v.optional(v.boolean(), true),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	const filePath = root.source?.input.file ?? '';
	const fileName = path.parse(filePath).name;
	if (!fileName) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	const strictMatch = fileName.startsWith(bemBlock.blockName);
	const nonStrictMatch = kebabCase(fileName)
		.startsWith(kebabCase(bemBlock.blockName));

	const reportType = (type: 'match' | 'matchCase') => {
		report({
			message: messages[type](bemBlock.blockName),
			node: bemBlock.rule,
			index: 0,
			endIndex: 1,
		});
	};

	if (!strictMatch && secondary.caseSensitive) {
		reportType(nonStrictMatch ? 'matchCase' : 'match');
	}

	if (!nonStrictMatch && !secondary.caseSensitive) {
		reportType('match');
	}
});
