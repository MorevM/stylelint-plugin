import path from 'node:path';
import { kebabCase } from '@morev/utils';
import { getBemBlock } from '#modules/bem';
import { createRule, extractSeparators, mergeMessages } from '#modules/rule-utils';
import { schema } from './match-file-name.schema';

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
	schema,
}, (primary, secondary, { report, messages: ruleMessages, root }) => {
	const filePath = root.source?.input.file ?? '';
	const sourceName = secondary.matchDirectory
		? path.basename(path.dirname(filePath))
		: path.parse(filePath).name;
	if (!sourceName) return;

	const separators = extractSeparators(secondary.separators);
	const bemBlock = getBemBlock(root, separators);
	if (!bemBlock) return;

	const messages = mergeMessages(ruleMessages, secondary.messages);

	const entity = secondary.matchDirectory ? 'directory' : 'file';

	const hasStrictMatch = sourceName.startsWith(bemBlock.blockName);
	const hasNonStrictMatch = kebabCase(sourceName)
		.startsWith(kebabCase(bemBlock.blockName));

	const reportType = (type: 'match' | 'matchCase') => {
		report({
			message: messages[type](entity, bemBlock.blockName),
			messageArgs: [type, entity, bemBlock.blockName],
			node: bemBlock.rule,
			index: 0,
			endIndex: 1,
		});
	};

	if (!hasStrictMatch && secondary.caseSensitive) {
		reportType(hasNonStrictMatch ? 'matchCase' : 'match');
	}

	if (!hasNonStrictMatch && !secondary.caseSensitive) {
		reportType('match');
	}
});
