import { quote, stripIndent } from '@morev/utils';
import type { ProcessedPattern } from '../../selector-pattern.types';

export const createMessage = (
	bemEntity: string,
	entityValue: string,
	fullSelector: string,
	patterns: ProcessedPattern[],
) => {
	const patternsString = patterns
		.map((pattern) => quote(pattern.source, '`'))
		.join(', ');

	const suffix = patterns.length === 1
		? `to match pattern ${patternsString}`
		: `to match one of the following [${patternsString}]`;

	return stripIndent(`
		Expected BEM ${bemEntity} \`${entityValue}\` ${suffix}.
		Full selector: \`${fullSelector}\`
	`);
};
