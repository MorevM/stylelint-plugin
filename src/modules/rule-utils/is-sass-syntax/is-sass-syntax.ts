import { fileExtension } from '@morev/utils';
import type { Root } from 'postcss';
import type { PostcssResult } from 'stylelint';

/**
 * Enables Sass-specific checks only when the stylesheet can be identified as Sass.
 * Recognized extensions take precedence: `.css` selects CSS, `.scss` and `.sass` select Sass.
 * Otherwise, only the explicit `postcss-scss` identifier enables these checks.
 * Parser objects and wrappers remain unknown without a recognized filename.
 *
 * @param   root     Stylesheet being checked, including its original filename when available.
 * @param   result   Processing result containing the resolved Stylelint configuration.
 *
 * @returns          Whether Sass-specific checks apply to this stylesheet.
 */
export const isSassSyntax = (root: Root, result: PostcssResult): boolean => {
	const extension = fileExtension(root.source?.input.file ?? result.opts.from ?? '')?.toLowerCase();
	if (extension === 'css') return false;
	if (extension === 'scss' || extension === 'sass') return true;

	return result.stylelint.config?.customSyntax === 'postcss-scss';
};
