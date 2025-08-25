import path from 'node:path';
import { kebabCase } from '@morev/utils';
import * as v from 'valibot';
import { getBemBlock } from '#modules/bem';
import { createRule, mergeMessages, vMessagesSchema } from '#modules/rule-utils';

export default createRule({
	scope: 'bem',
	name: 'match-file-name',
	meta: {
		description: 'Requires the file name to begin with the name of the BEM block it represents.',
		deprecated: false,
		fixable: false,
	},
	messages: {
		match: (entity: 'directory' | 'file', blockName: string) =>
			`The ${entity} name must start with its block name: "${blockName}"`,
		matchCase: (entity: 'directory' | 'file', blockName: string) =>
			`The ${entity} name must start with its block name: "${blockName}", including correct case.`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				caseSensitive: v.optional(v.boolean(), true),
				matchDirectory: v.optional(v.boolean(), false),
				messages: vMessagesSchema({
					match: [v.picklist(['file', 'directory']), v.string()],
					matchCase: [v.picklist(['file', 'directory']), v.string()],
				}),
			}),
		),
	},
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const filePath = root.source?.input.file ?? '';
	const sourceName = secondary.matchDirectory
		? path.basename(path.dirname(filePath))
		: path.parse(filePath).name;
	if (!sourceName) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);

	const entity = secondary.matchDirectory ? 'directory' : 'file';

	const strictMatch = sourceName.startsWith(bemBlock.blockName);
	const nonStrictMatch = kebabCase(sourceName)
		.startsWith(kebabCase(bemBlock.blockName));

	const reportType = (type: 'match' | 'matchCase') => {
		report({
			message: messages[type](entity, bemBlock.blockName),
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
