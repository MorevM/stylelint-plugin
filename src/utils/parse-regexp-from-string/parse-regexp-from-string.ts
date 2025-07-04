export const parseRegExpFromString = (value: string) => {
	const match = value.match(/^\/(.*)\/([dgimsuvy]*)$/);
	if (!match) return null;

	return {
		pattern: match[1],
		flags: match[2],
	};
};
