import { isObject, quote } from '@morev/utils';
import stylelint from 'stylelint';
import * as v from 'valibot';
import type { PostcssResult } from 'stylelint';
import type { BaseIssue, GenericSchema } from 'valibot';

type ReturnValue<
	PrimarySchema extends GenericSchema,
	SecondarySchema extends GenericSchema,
> = {
	success: boolean;
	primary: Exclude<v.InferOutput<PrimarySchema>, undefined>;
	secondary: Exclude<v.InferOutput<SecondarySchema>, undefined>;
};

const createErrorMessage = (
	type: 'primary' | 'secondary',
	ruleName: string,
	issues: any[],
) => {
	const base = type === 'primary'
		? `Invalid primary option value for rule ${quote(ruleName)}`
		: `Invalid secondary option {path} for rule ${quote(ruleName)}`;

	const messages = issues.map((issue) => {
		const message = `expected ${quote(issue.expected, '`')} but got ${quote(issue.received, '`')}`;
		const path = issue.path?.map((pathPart: any) => pathPart.key).join('.');
		const formattedBase = base.replace('{path}', path ? quote(path, "'") : ' ');

		return `${formattedBase}: ${message}`;
	});

	return messages.join('\n');
};

export const validateOptions = <
	PrimarySchema extends GenericSchema,
	SecondarySchema extends GenericSchema,
>(
	result: PostcssResult,
	ruleName: string,
	primaryInput: unknown,
	secondaryInput: unknown,
	schema: { primary: PrimarySchema; secondary?: SecondarySchema },
) => {
	let wasComplain = false;
	const complain = (message: string) => {
		wasComplain = true;
		result.warn(message, { stylelintType: 'invalidOption' });
		result.stylelint.stylelintError = true;
	};

	const primaryParsingResult = v.safeParse(schema.primary, primaryInput);
	if (!primaryParsingResult.success) {
		complain(createErrorMessage('primary', ruleName, primaryParsingResult.issues));
	}

	const primary = primaryParsingResult.success
		? primaryParsingResult.output
		: v.getDefaults(schema.primary) as any;

	const secondary = (() => {
		if (!schema.secondary) return;

		const whatParse = schema.secondary.type === 'optional'
			/* @ts-expect-error -- No such type */
			? schema.secondary.wrapped
			: schema.secondary;

		const secondaryParsingResult = v.safeParse(whatParse, secondaryInput);

		const isEmptyOptionalInput = secondaryInput === undefined && schema.secondary.type === 'optional';
		if (!secondaryParsingResult.success && !isEmptyOptionalInput) {
			// complain(secondaryParsingResult.issues.map((issue) => issue.message).join('\n'));
			complain(createErrorMessage('secondary', ruleName, secondaryParsingResult.issues));
		}

		return secondaryParsingResult?.success
			? secondaryParsingResult.output
			: v.getDefaults(whatParse);
	})();

	return {
		success: !wasComplain,
		primary,
		secondary,
	};
};
