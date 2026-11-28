import { isUndefined } from '@morev/utils';
import type { Container } from 'postcss';

/**
 * Infers one indentation level when a container has no multiline child to copy.
 * A nested block and its parent's closing line can supply a local sample.
 *
 * @param   container   Block receiving a new line.
 *
 * @returns             Local indentation step or PostCSS's file-wide style.
 */
export const getIndentStep = (container: Container): string => {
	const { parent } = container;
	if (parent && parent.type !== 'root') {
		const indent = /\n([\t ]*)$/u;
		const blockIndent = indent.exec(container.raws.before ?? '')?.[1];
		const parentIndent = indent.exec(parent.raws.after ?? '')?.[1];
		if (blockIndent && !isUndefined(parentIndent) && blockIndent.startsWith(parentIndent)) {
			const step = blockIndent.slice(parentIndent.length);
			if (step) return step;
		}
	}

	return container.raw('indent');
};
