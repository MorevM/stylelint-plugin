type Messages = Record<string, (...args: any[]) => string>;

/**
 * Merges default plugin messages with user-provided messages. \
 * User messages override the corresponding plugin messages if provided.
 *
 * @param   pluginMessages   Default messages provided by the plugin.
 * @param   userMessages     Optional user-provided messages to override defaults.
 *
 * @returns                  Merged messages.
 */
export const mergeMessages = <T extends Messages>(
	pluginMessages: T,
	userMessages: Partial<T> | undefined,
): T => {
	return {
		...pluginMessages,
		...userMessages,
	};
};
