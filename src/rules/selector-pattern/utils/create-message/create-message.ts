import { quote } from '@morev/utils';
import type { ProcessedPattern } from '../../selector-pattern.types';

export const createMessage = (
	bemEntity: string,
	entityValue: string,
	patterns: ProcessedPattern[],
) => {
	const patternsString = patterns
		.map((pattern) => quote(pattern.source, '`'))
		.join(', ');

	const suffix = patterns.length === 1
		? `to match pattern ${patternsString}`
		: `to match one of the following [${patternsString}]`;

	return `Expected BEM ${bemEntity} \`${entityValue}\` ${suffix}`;
};
