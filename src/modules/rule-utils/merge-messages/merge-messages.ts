import { isString, stripIndent, tsObject } from '@morev/utils';

type Messages = Record<string, (...args: any[]) => string>;

/**
 * Merges default rule messages with user-provided messages. \
 *
 * For each message:
 * * If a user-provided function exists and returns a string, its result is used.
 * * If the user-provided function returns a non-string value or is not provided, the corresponding rule message function is used instead.
 * * The final output of either function is automatically processed with `stripIndent`.
 *
 * @param   ruleMessages   Default messages provided by the rule.
 * @param   userMessages   Optional user-provided messages to override defaults.
 *
 * @returns                Merged messages.
 */
export const mergeMessages = <T extends Messages>(
	ruleMessages: T,
	userMessages: Partial<T> | undefined,
): T => {
	return tsObject.entries(ruleMessages)
		.reduce((acc, [key, ruleMessageFunction]) => {
			acc[key] = ((...args: unknown[]) => {
				const userMessageFunction = userMessages?.[key];
				const userResult = userMessageFunction?.(...args);

				if (isString(userResult)) {
					return stripIndent(userResult);
				}
				return stripIndent(ruleMessageFunction(...args));
			}) as T[typeof key];

			return acc;
		}, {} as T);
};
