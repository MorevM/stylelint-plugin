import stylelint from 'stylelint';
import { validateOptions } from '#modules/rule-utils/validate-options/validate-options';
import type { Root } from 'postcss';
import type { PostcssResult, Problem, Rule, RuleMeta } from 'stylelint';
import type { GenericSchema, InferOutput } from 'valibot';

const { utils: { report, ruleMessages } } = stylelint;

type MessagesTemplate = {
	[key: string]: (...any: any[]) => string;
};

type Options<
	PrimaryOptionSchema extends GenericSchema,
	SecondaryOptionsSchema extends GenericSchema,
	Messages extends MessagesTemplate,
> = {
	name: string;
	messages: Messages;
	meta: RuleMeta;
	schema: {
		primary: PrimaryOptionSchema;
		secondary?: SecondaryOptionsSchema;
	};
};

type Callback<
	PrimaryOptionSchema extends GenericSchema,
	SecondaryOptionsSchema extends GenericSchema,
	Messages extends MessagesTemplate,
> = (
	primaryOption: Exclude<InferOutput<PrimaryOptionSchema>, undefined>,
	secondaryOptions: Exclude<InferOutput<SecondaryOptionsSchema>, undefined>,
	context: {
		root: Root;
		result: PostcssResult;
		messages: Messages;
		report: (problem: BetterProblem) => ReturnType<typeof report>;
	},
) => void;

type BetterProblem = Omit<Problem, 'node' | 'ruleName' | 'result' | 'line' | 'start'>
	& ({
		node: Problem['node'];
		index?: Exclude<Problem['index'], undefined>;
		endIndex?: Exclude<Problem['endIndex'], undefined>;
	});

export const createRule = <
	Primary extends GenericSchema,
	Secondary extends GenericSchema,
	Messages extends MessagesTemplate,
>(
	options: Options<Primary, Secondary, Messages>,
	callback: Callback<Primary, Secondary, Messages>,
) => {
	const messages = ruleMessages(options.name, options.messages) as unknown as Messages;

	const rule: Rule = (primary_, secondary_, context) => {
		return (root, result) => {
			const {
				success,
				primary,
				secondary,
			} = validateOptions(result, options.name, primary_, secondary_, options.schema);
			if (!success) return;
			if (primary === null) return;

			callback(
				primary,
				secondary,
				{
					root,
					result,
					messages,
					report: (problem: BetterProblem) => report({
						ruleName: options.name,
						result,
						...problem,
					}),
				},
			);
		};
	};

	rule.ruleName = options.name;
	rule.messages = messages;
	rule.meta = options.meta;

	return rule as Rule & { messages: Messages };
};
