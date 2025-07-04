import path from 'node:path';
import type { Root } from 'postcss';

/**
 * Checks if the PostCSS AST represents a CSS file.
 *
 * @param   root   PostCSS `Root` object.
 *
 * @returns        Whether the tree represents a CSS file.
 */
export const isCssFile = (root: Root) => {
	const fileExtension = path.extname(root.source?.input.file ?? '');
	return fileExtension === '.css';
};
