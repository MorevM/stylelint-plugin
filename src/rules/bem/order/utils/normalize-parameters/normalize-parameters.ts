import valueParser from 'postcss-value-parser';

/**
 * Normalizes insignificant parameter spacing while preserving parsed values.
 *
 * @param   value   Authored at-rule parameters.
 *
 * @returns         Trimmed parameters with consistent spaces and compact function and divider boundaries.
 */
export const normalizeParameters = (value: string) => {
	const parsed = valueParser(value);
	parsed.walk((node) => {
		if (node.type === 'space') node.value = ' ';
		if (node.type === 'function' || node.type === 'div') {
			node.before = '';
			node.after = '';
		}
	});
	return valueParser.stringify(parsed.nodes).trim();
};
